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
from translator.glossary import CONTRATO, DEFAULT_PATH  # noqa: E402
from translator.translate import (  # noqa: E402  (tope del contrato: contrato.json)
    MAX_TEXTO,
    GlossResult,  # noqa: E402
    recortar,
)
from translator.voz import VozNoConfigurada, elegir_voz, normalizar_para_voz  # noqa: E402

__all__ = ["DEFAULT_PATH", "GlossResult", "MAX_TEXTO", "SimpleResult", "Traductor", "load_escenario", "normalizar_para_voz", "recortar", "elegir_voz", "VozNoConfigurada"]


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

    async def a_glosas(self, texto: str) -> GlossResult:
        """v4: lo que dice el ejecutivo → glosas LSCh validadas contra el diccionario (para el avatar)."""
        return await asyncio.to_thread(self.translator.espanol_a_glosas, texto[:MAX_TEXTO])

    async def complejizar(self, texto: str) -> str:
        return await asyncio.to_thread(self.translator.complejizar, texto[:MAX_TEXTO])

    async def glosas_a_espanol(self, glosas: list[str]) -> str:
        """v3: glosas que firmó el cliente (cámara) → frase natural, con el mismo traductor que `complejizar`."""
        return await asyncio.to_thread(self.translator.glosas_a_espanol, glosas)

    def glosas_conocidas(self, glosas: list[str]) -> list[str]:
        """Solo las glosas del diccionario (o deletreo), con el tope del contrato. Una desconocida se descarta, no tumba el mensaje."""
        g = self.translator.glossary
        return [x for x in glosas if isinstance(x, str) and g.is_known(x)][: CONTRATO["max_glosas"]]

    def para_voz(self, frase: str) -> str:
        """Lo que dirá el <Say> de Twilio: RUT, horas, montos y pronunciación del escenario (como el TTS del agente)."""
        return normalizar_para_voz(frase, self.translator.escenario.pronunciacion)
