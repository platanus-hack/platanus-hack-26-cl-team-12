"""Voz chilena para lo que escucha el ejecutivo: ElevenLabs genera el audio y Twilio lo reproduce con <Play>.

Mismas voces que el agente (`translator.voz.elegir_voz`: ELEVENLABS_VOICE_ID / ELEVENLABS_VOICE_ID_HOMBRE).
Si falta ELEVENLABS_API_KEY o ElevenLabs falla, `preparar` devuelve None y Twilio usa su propia voz (<Say>).

Privacidad (seguridad-datos-cl): el audio de una respuesta puede traer RUT o datos de salud. Vive solo en memoria,
con id no adivinable, y se borra a los TTL_S segundos o al empezar otra llamada. Las frases fijas (saludo, "un
momento") no tienen datos personales y se guardan para no pagar dos veces por lo mismo.
"""

import logging
import os
import secrets
import time

import httpx

from app.traductor import VozNoConfigurada, elegir_voz

log = logging.getLogger("puente.voz")

URL_TTS = "https://api.elevenlabs.io/v1/text-to-speech/{voz}"
FORMATO = "mp3_22050_32"  # liviano: por teléfono no se nota más calidad y Twilio lo descarga más rápido
TTL_S = 300
MAX_CHARS = 500  # tope de costo por frase (el plan gratis de ElevenLabs trae ~10.000 caracteres al mes)


class Voz:
    def __init__(self) -> None:
        self._audios: dict[str, tuple[float, bytes]] = {}  # id → (vence, mp3) de respuestas del cliente
        self._fijas: dict[str, bytes] = {}  # id → mp3 de frases sin datos personales
        self._id_fija: dict[str, str] = {}  # texto → id

    def activa(self) -> bool:
        if not os.getenv("ELEVENLABS_API_KEY"):
            return False
        try:
            elegir_voz()
        except VozNoConfigurada:
            return False
        return True

    async def _generar(self, texto: str) -> bytes | None:
        try:
            async with httpx.AsyncClient(timeout=15) as http:
                r = await http.post(
                    URL_TTS.format(voz=elegir_voz()),
                    params={"output_format": FORMATO},
                    headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"]},
                    json={
                        "text": texto[:MAX_CHARS],
                        "model_id": os.getenv("ELEVENLABS_MODEL", "eleven_flash_v2_5"),
                        "language_code": "es",
                    },
                )
            if r.status_code != 200 or not r.content:
                log.warning("ElevenLabs respondió %s; se usa la voz de Twilio", r.status_code)
                return None
            return r.content
        except Exception as e:  # red, timeout, voz mal configurada: nunca cortar la llamada por la voz
            log.warning("ElevenLabs falló (%s); se usa la voz de Twilio", type(e).__name__)
            return None

    async def preparar(self, texto: str, fija: bool = False) -> str | None:
        """Genera el audio y devuelve su id para /twilio/audio/{id}.mp3, o None si hay que usar <Say>."""
        if not texto.strip() or not self.activa():
            return None
        if fija and texto in self._id_fija:
            return self._id_fija[texto]
        mp3 = await self._generar(texto)
        if mp3 is None:
            return None
        id_ = secrets.token_urlsafe(16)
        if fija:
            self._fijas[id_] = mp3
            self._id_fija[texto] = id_
        else:
            self._limpiar()
            self._audios[id_] = (time.monotonic() + TTL_S, mp3)
        return id_

    def audio(self, id_: str) -> bytes | None:
        if id_ in self._fijas:
            return self._fijas[id_]
        vence, mp3 = self._audios.get(id_, (0.0, b""))
        return mp3 if vence > time.monotonic() else None

    def olvidar_respuestas(self) -> None:
        """Nueva llamada: se borran los audios con datos de la llamada anterior."""
        self._audios.clear()

    def _limpiar(self) -> None:
        ahora = time.monotonic()
        for id_ in [k for k, (vence, _) in self._audios.items() if vence <= ahora]:
            del self._audios[id_]


voz = Voz()
