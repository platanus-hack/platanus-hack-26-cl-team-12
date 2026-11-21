"""Traducción glosas ↔ español chileno con Claude (ADR-0004).

Son funciones puras sobre un cliente de Anthropic inyectable, para poder testearlas sin red.
"""

import os
from dataclasses import dataclass, field

from .glossary import Glossary, fingerspell

MODEL = os.getenv("TRANSLATOR_MODEL", "claude-haiku-5-5")

REGLAS_LSCH = """Eres intérprete entre Lengua de Señas Chilena (LSCh) y español chileno.
La LSCh tiene gramática propia: no es español signado. Usa orden tópico-comentario,
marca el tiempo al inicio (MAÑANA, LUNES), omite artículos y conectores.
Conserva cifras, fechas, nombres y montos exactos. No inventes datos.
Simplificar no es infantilizar: frases cortas, una idea por mensaje."""

GLOSAS_TOOL = {
    "name": "emitir_glosas",
    "description": "Entrega la traducción a glosas LSCh usando SOLO glosas del diccionario.",
    "input_schema": {
        "type": "object",
        "properties": {
            "glosas": {"type": "array", "items": {"type": "string"}},
            "deletrear": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Palabras sin glosa (nombres propios, siglas) para deletreo manual.",
            },
            "subtitulo": {"type": "string", "description": "Versión simple en español para subtítulo."},
        },
        "required": ["glosas", "subtitulo"],
    },
}


@dataclass
class GlossResult:
    glosas: list[str]
    subtitulo: str
    descartadas: list[str] = field(default_factory=list)


class Translator:
    def __init__(self, client, glossary: Glossary, contexto: str = ""):
        self.client = client
        self.glossary = glossary
        self.contexto = contexto  # escenario de demo (banco / hora médica)

    def _system(self) -> list[dict]:
        estatico = f"{REGLAS_LSCH}\n\nEscenario: {self.contexto}\n\nDiccionario (glosa = español):\n{self.glossary.as_prompt()}"
        return [{"type": "text", "text": estatico, "cache_control": {"type": "ephemeral"}}]

    def glosas_a_espanol(self, glosas: list[str]) -> str:
        """v3: glosas firmadas por el cliente → frase natural y cortés para el ejecutivo."""
        msg = self.client.messages.create(
            model=MODEL,
            max_tokens=200,
            system=self._system(),
            messages=[{
                "role": "user",
                "content": "Convierte estas glosas en UNA frase natural en español chileno, cortés y "
                f"formal, sin agregar información. Responde solo la frase.\n\nGlosas: {' '.join(glosas)}",
            }],
        )
        return "".join(b.text for b in msg.content if b.type == "text").strip()

    def simplificar(self, texto: str) -> str:
        """v2: lo que dice el ejecutivo → español simple para el cliente."""
        msg = self.client.messages.create(
            model=MODEL,
            max_tokens=200,
            system=self._system(),
            messages=[{
                "role": "user",
                "content": f"Simplifica para una persona sorda (el español es su segunda lengua). Responde solo el texto.\n\n{texto}",
            }],
        )
        return "".join(b.text for b in msg.content if b.type == "text").strip()

    def espanol_a_glosas(self, texto: str) -> GlossResult:
        """v4: lo que dice el ejecutivo → glosas para el reproductor de señas, validadas contra el diccionario."""
        msg = self.client.messages.create(
            model=MODEL,
            max_tokens=300,
            system=self._system(),
            tools=[GLOSAS_TOOL],
            tool_choice={"type": "tool", "name": "emitir_glosas"},
            messages=[{"role": "user", "content": f"Traduce a glosas LSCh:\n\n{texto}"}],
        )
        data = next(b.input for b in msg.content if b.type == "tool_use")
        return self.validar(data.get("glosas", []), data.get("deletrear", []), data["subtitulo"])

    def validar(self, glosas: list[str], deletrear: list[str], subtitulo: str) -> GlossResult:
        """Toda glosa debe existir en el diccionario (ADR-0004); las palabras sueltas se deletrean."""
        validas = [g for g in glosas if self.glossary.is_known(g)]
        descartadas = [g for g in glosas if not self.glossary.is_known(g)]
        validas += [f for f in (fingerspell(p) for p in deletrear) if f]
        return GlossResult(glosas=validas, subtitulo=subtitulo, descartadas=descartadas)
