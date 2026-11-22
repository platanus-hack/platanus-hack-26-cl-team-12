"""Traductor de la API: reusa el de services/agent/translator (una sola fuente de prompts, glosario y escenario).

El `Translator` del agente es síncrono; aquí se envuelve con `asyncio.to_thread` para no bloquear FastAPI.
En el contenedor de la API el Dockerfile copia `services/agent/translator` a la misma ruta relativa.
"""

import asyncio
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
_AGENT = str(REPO_ROOT / "services" / "agent")
if _AGENT not in sys.path:
    sys.path.insert(0, _AGENT)

from translator import SimpleResult, Translator, load_escenario, load_glossary  # noqa: E402

MAX_TEXTO = 600  # caracteres por turno: tope de costo y de abuso (A4)

__all__ = ["MAX_TEXTO", "SimpleResult", "Traductor"]


class Traductor:
    """Simplificar (ejecutivo → cliente) y complejizar (cliente → ejecutivo), async."""

    def __init__(self, translator: Translator | None = None):
        self._translator = translator

    @property
    def translator(self) -> Translator:
        if self._translator is None:
            import anthropic

            # Lee ANTHROPIC_API_KEY, TRANSLATOR_MODEL, GLOSSES_PATH y ESCENARIO del entorno.
            self._translator = Translator(anthropic.Anthropic(), load_glossary(), load_escenario())
        return self._translator

    async def simplificar(self, texto: str) -> SimpleResult:
        return await asyncio.to_thread(self.translator.simplificar, texto[:MAX_TEXTO])

    async def complejizar(self, texto: str) -> str:
        return await asyncio.to_thread(self.translator.complejizar, texto[:MAX_TEXTO])
