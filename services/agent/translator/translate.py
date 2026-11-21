"""Traducción ejecutivo ↔ persona sorda con Claude (ADR-0004, v2 y v4).

- simplificar: lo que dice el ejecutivo → español simple + respuestas rápidas (v2).
- complejizar / glosas_a_espanol: lo que escribe o firma el cliente → frase natural para decir por teléfono (v2/v3).
- espanol_a_glosas: lo que dice el ejecutivo → glosas para el reproductor de señas (v4).

Son funciones síncronas sobre un cliente de Anthropic inyectable, para poder testearlas sin red.
"""

import os
from dataclasses import dataclass, field

from . import prompts
from .glossary import Glossary, fingerspell, is_literal, literal

MODEL = os.getenv("TRANSLATOR_MODEL", "claude-haiku-5-5")

MAX_OPCIONES = 4
MAX_OPCION_CHARS = 40
MAX_GLOSAS = 30  # mismo tope que el contrato (packages/glosses/src/contract.ts)

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
    def __init__(self, client, glossary: Glossary, contexto: str = ""):
        self.client = client
        self.glossary = glossary
        self.contexto = contexto or "una llamada para reservar una hora médica en un centro de salud de Chile"

    def _system(self, tarea: str) -> list[dict]:
        base = prompts.BASE.format(escenario=self.contexto, diccionario=self.glossary.as_prompt())
        # El bloque base es idéntico en todas las tareas: se cachea una vez y se reutiliza.
        return [
            {"type": "text", "text": base, "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": tarea},
        ]

    def simplificar(self, texto: str) -> SimpleResult:
        """v2: lo que dice el ejecutivo → español simple + respuestas rápidas."""
        msg = self.client.messages.create(
            model=MODEL,
            max_tokens=500,
            system=self._system(prompts.SIMPLIFICAR),
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
        msg = self.client.messages.create(
            model=MODEL,
            max_tokens=200,
            system=self._system(prompts.COMPLEJIZAR),
            messages=[{"role": "user", "content": texto}],
        )
        return _texto(msg) or texto

    def glosas_a_espanol(self, glosas: list[str]) -> str:
        """v3: glosas firmadas por el cliente → frase natural. Es el mismo problema que complejizar."""
        return self.complejizar(" ".join(glosas))

    def espanol_a_glosas(self, texto: str) -> GlossResult:
        """v4: lo que dice el ejecutivo → glosas para el reproductor de señas, validadas contra el diccionario."""
        msg = self.client.messages.create(
            model=MODEL,
            max_tokens=1000,  # con 300 Haiku a veces devolvía vacío (lab/v4_avatar)
            system=self._system(prompts.A_GLOSAS),
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
            if canon is None and g.upper().startswith("TEXTO:"):
                canon = literal(g[len("TEXTO:"):]) or None
            if canon is not None and (self.glossary.is_known(canon) or is_literal(canon)):
                validas.append(canon)
            else:
                descartadas.append(g)
        validas += [f for f in (fingerspell(p) for p in deletrear) if f]
        return GlossResult(glosas=validas[:MAX_GLOSAS], subtitulo=subtitulo, descartadas=descartadas)
