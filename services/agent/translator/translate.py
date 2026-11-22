"""Traducción ejecutivo ↔ persona sorda con Claude (ADR-0004, v2 y v4).

- simplificar: lo que dice el ejecutivo → español simple + respuestas rápidas (v2).
- complejizar / glosas_a_espanol: lo que escribe o firma el cliente → frase natural para decir por teléfono (v2/v3).
- espanol_a_glosas: lo que dice el ejecutivo → glosas para el reproductor de señas (v4).

Son funciones síncronas sobre un cliente de Anthropic inyectable, para poder testearlas sin red.
"""

import hashlib
import os
from dataclasses import asdict, dataclass, field

from . import prompts
from .cache_key import normalizar_entrada
from .escenario import Escenario, load_escenario
from .glossary import (
    CONTRATO,
    LITERAL_MAX_CHARS,
    LITERAL_PREFIX,
    Glossary,
    fingerspell,
    is_literal,
    literal,
)

MODELO_DEFECTO = "claude-haiku-5-5"
# Tope de tokens de salida por tarea. Las glosas necesitan más: con 300 Haiku a veces devolvía vacío (lab/v4_avatar).
MAX_TOKENS = {"simplificar": 500, "complejizar": 1024, "espanol_a_glosas": 1000}


def modelo() -> str:
    """Se lee al usarlo (no al importar), para que el .env cargado por agent.py ya esté aplicado."""
    return os.getenv("TRANSLATOR_MODEL", MODELO_DEFECTO)

# Topes del contrato (packages/glosses/data/contrato.json, compartido con la web).
MAX_OPCIONES = CONTRATO["max_opciones"]
MAX_OPCION_CHARS = CONTRATO["max_opcion_chars"]
MAX_GLOSAS = CONTRATO["max_glosas"]
MAX_TEXTO = CONTRATO["max_texto"]


def recortar(texto: str, maximo: int = MAX_TEXTO) -> str:
    """El contrato rechaza textos sobre `max_texto`: se recortan para que el subtítulo nunca se pierda."""
    return texto if len(texto) <= maximo else texto[: maximo - 1].rstrip() + "…"

SIMPLE_TOOL = {
    "name": "emitir_simple",
    "description": "Entrega el texto simplificado para la persona sorda y, si el ejecutivo preguntó, respuestas rápidas.",
    "input_schema": {
        "type": "object",
        "properties": {
            "simple": {"type": "string", "description": "Texto simple, frases cortas separadas por salto de línea."},
            "opciones": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Respuestas rápidas (máx. 4). Vacío si el ejecutivo no preguntó.",
            },
        },
        "required": ["simple", "opciones"],
    },
}

GLOSAS_TOOL = {
    "name": "emitir_glosas",
    "description": "Entrega la traducción a glosas LSCh usando SOLO glosas del diccionario o literales TEXTO:<dato>.",
    "input_schema": {
        "type": "object",
        "properties": {
            "glosas": {"type": "array", "items": {"type": "string"}},
            "subtitulo": {"type": "string", "description": "Versión simple en español para subtítulo."},
        },
        "required": ["glosas", "subtitulo"],
    },
}


@dataclass
class SimpleResult:
    simple: str
    opciones: list[str] = field(default_factory=list)


@dataclass
class GlossResult:
    glosas: list[str]
    subtitulo: str
    descartadas: list[str] = field(default_factory=list)


def _texto(msg) -> str:
    return "".join(b.text for b in msg.content if b.type == "text").strip()


def _tool_input(msg) -> dict | None:
    return next((b.input for b in msg.content if b.type == "tool_use"), None)


def limpiar_opciones(opciones) -> list[str]:
    """Máx. 4 opciones no vacías, sin repetir y de largo acotado (van a botones y al contrato)."""
    if not isinstance(opciones, list):
        return []
    out: list[str] = []
    for o in opciones:
        if not isinstance(o, str):
            continue
        o = " ".join(o.split())
        if o and len(o) <= MAX_OPCION_CHARS and o not in out:
            out.append(o)
    return out[:MAX_OPCIONES]


class Translator:
    """`store` (opcional, ver store.py) cachea frases genéricas repetidas para no volver a llamar a Claude."""

    def __init__(self, client, glossary: Glossary, escenario: Escenario | None = None, store=None):
        self.client = client
        self.glossary = glossary
        self.escenario = escenario or load_escenario()
        self.store = store
        self.model = modelo()
        self.cache_hits = 0  # métrica (B6): cuántas traducciones salieron de la caché
        self._frecuentes = {
            lado: {normalizar_entrada(f) for f in frases}
            for lado, frases in self.escenario.frases_frecuentes.items()
        }
        base = prompts.system_base(self.escenario.descripcion, glossary.as_prompt())
        params = {"max_opciones": MAX_OPCIONES, "literal": LITERAL_PREFIX, "literal_max": LITERAL_MAX_CHARS}
        self._base = base
        self._tareas = {n: prompts.tarea(n, self.escenario.ejemplos, **params) for n in prompts.TAREAS}
        # Si cambia el modelo, un prompt, el escenario o el diccionario, la caché vieja deja de calzar.
        self._version = {
            n: hashlib.sha256(f"{self.model}\x1f{base}\x1f{t}".encode()).hexdigest()[:16] for n, t in self._tareas.items()
        }

    def _system(self, tarea: str) -> list[dict]:
        # El bloque base es idéntico en todas las tareas: se cachea una vez y se reutiliza.
        return [
            {"type": "text", "text": self._base, "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": self._tareas[tarea]},
        ]

    def _cacheable(self, tarea: str, texto: str) -> bool:
        """Solo frases de la lista blanca del escenario: nunca se guarda texto libre de la llamada."""
        lado = "cliente" if tarea == "complejizar" else "ejecutivo"
        return self.store is not None and normalizar_entrada(texto) in self._frecuentes.get(lado, set())

    def _cache_get(self, tarea: str, texto: str) -> dict | None:
        if not self._cacheable(tarea, texto):
            return None
        hit = self.store.cache_get(tarea, self._version[tarea], texto)
        if hit is not None:
            self.cache_hits += 1
        return hit

    def _cache_put(self, tarea: str, texto: str, salida: dict) -> None:
        if self._cacheable(tarea, texto):
            self.store.cache_put(tarea, self._version[tarea], texto, salida)

    def simplificar(self, texto: str) -> SimpleResult:
        """v2: lo que dice el ejecutivo → español simple + respuestas rápidas."""
        if (hit := self._cache_get("simplificar", texto)) is not None:
            return SimpleResult(**hit)
        r = self._simplificar(texto)
        self._cache_put("simplificar", texto, asdict(r))
        return r

    def _simplificar(self, texto: str) -> SimpleResult:
        msg = self.client.messages.create(
            model=self.model,
            max_tokens=MAX_TOKENS["simplificar"],
            system=self._system("simplificar"),
            tools=[SIMPLE_TOOL],
            tool_choice={"type": "tool", "name": "emitir_simple"},
            messages=[{"role": "user", "content": texto}],
        )
        data = _tool_input(msg)
        if not data or not isinstance(data.get("simple"), str) or not data["simple"].strip():
            return SimpleResult(simple=_texto(msg) or texto)  # nunca dejar al cliente sin texto
        return SimpleResult(simple=data["simple"].strip(), opciones=limpiar_opciones(data.get("opciones")))

    def complejizar(self, texto: str) -> str:
        """v2: lo que escribe el cliente (simple, a veces con glosas) → frase natural para decir por teléfono."""
        if (hit := self._cache_get("complejizar", texto)) is not None:
            return hit["frase"]
        msg = self.client.messages.create(
            model=self.model,
            max_tokens=MAX_TOKENS["complejizar"],
            # Reescritura corta: sin pensamiento. En Haiku 5.5 viene activado y gastaba los 200 tokens de antes;
            # la mitad de las veces la frase salía vacía (se decían las glosas tal cual) o cortada ("Mi hijo se cay").
            thinking={"type": "disabled"},
            system=self._system("complejizar"),
            messages=[{"role": "user", "content": texto}],
        )
        frase = _texto(msg)
        if not frase:
            return texto
        self._cache_put("complejizar", texto, {"frase": frase})
        return frase

    def glosas_a_espanol(self, glosas: list[str]) -> str:
        """v3: glosas firmadas por el cliente → frase natural. Es el mismo problema que complejizar."""
        return self.complejizar(" ".join(glosas))

    def espanol_a_glosas(self, texto: str) -> GlossResult:
        """v4: lo que dice el ejecutivo → glosas para el reproductor de señas, validadas contra el diccionario."""
        if (hit := self._cache_get("espanol_a_glosas", texto)) is not None:
            return GlossResult(**hit)
        r = self._espanol_a_glosas(texto)
        if r.glosas:
            self._cache_put("espanol_a_glosas", texto, asdict(r))
        return r

    def _espanol_a_glosas(self, texto: str) -> GlossResult:
        msg = self.client.messages.create(
            model=self.model,
            max_tokens=MAX_TOKENS["espanol_a_glosas"],
            system=self._system("espanol_a_glosas"),
            tools=[GLOSAS_TOOL],
            tool_choice={"type": "tool", "name": "emitir_glosas"},
            messages=[{"role": "user", "content": texto}],
        )
        data = _tool_input(msg) or {}
        glosas = data.get("glosas") if isinstance(data.get("glosas"), list) else []
        subtitulo = data.get("subtitulo") if isinstance(data.get("subtitulo"), str) else ""
        return self.validar(glosas, subtitulo.strip() or texto)

    def validar(self, glosas: list, subtitulo: str, deletrear: list[str] = ()) -> GlossResult:
        """Toda glosa debe existir en el diccionario (ADR-0004) o ser un literal TEXTO: válido."""
        validas: list[str] = []
        descartadas: list[str] = []
        for g in glosas:
            if not isinstance(g, str):
                continue
            canon = self.glossary.resolve(g)
            if canon is None and g.upper().startswith(LITERAL_PREFIX):
                canon = literal(g[len(LITERAL_PREFIX):]) or None
            if canon is not None and (self.glossary.is_known(canon) or is_literal(canon)):
                validas.append(canon)
            else:
                descartadas.append(g)
        validas += [f for f in (fingerspell(p) for p in deletrear) if f]
        return GlossResult(glosas=validas[:MAX_GLOSAS], subtitulo=subtitulo, descartadas=descartadas)
