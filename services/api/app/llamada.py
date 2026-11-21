"""Plan C de v1: estado de la llamada, traducción con Claude y canal con la app del cliente.

Ejecutivo (teléfono) ⇄ Twilio <Gather>/<Say> ⇄ /twilio/* (twilio_media.py) ⇄ este módulo ⇄ WS /twilio/cliente ⇄ PWA
Mensajes del WebSocket con el cliente: los de docs/contrato.md (`ejecutivo_dice`, `cliente_dice`, `estado`).

TODO(v1): una sola llamada a la vez (demo). Para varias, indexar `Sala` por CallSid y unirla al token del cliente.
"""

import asyncio
import importlib.util
import json
import logging
import os
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

log = logging.getLogger("puente.llamada")
router = APIRouter(prefix="/twilio")

REPO_ROOT = Path(__file__).resolve().parents[3]
# Prompts afinados por B (Raimundo). Se cargan por ruta para tener una sola fuente.
# TODO(v2): moverlos a services/agent/translator/ cuando B agregue `complejizar` (B5).
_PROMPTS = REPO_ROOT / "lab" / "v2_simplificar" / "prompts.py"
MAX_TEXTO = 600  # caracteres por turno: tope de costo y de abuso (A4)


def _cargar_prompts():
    spec = importlib.util.spec_from_file_location("prompts_v2", _PROMPTS)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.SIMPLIFICAR, mod.COMPLEJIZAR


class Traductor:
    """Simplificar (ejecutivo → cliente) y complejizar (cliente → ejecutivo) con Claude."""

    def __init__(self, client=None):
        self.simplificar_prompt, self.complejizar_prompt = _cargar_prompts()
        self._client = client

    @property
    def client(self):
        if self._client is None:
            import anthropic

            self._client = anthropic.AsyncAnthropic()  # lee ANTHROPIC_API_KEY
        return self._client

    async def _pedir(self, system: str, texto: str) -> str:
        msg = await self.client.messages.create(
            model=os.getenv("TRANSLATOR_MODEL", "claude-haiku-5-5"),
            max_tokens=300,
            system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": texto[:MAX_TEXTO]}],
        )
        # Solo bloques de texto: el modelo puede devolver también bloques de razonamiento.
        return "".join(b.text for b in msg.content if b.type == "text").strip()

    async def simplificar(self, texto: str) -> str:
        return await self._pedir(self.simplificar_prompt, texto)

    async def complejizar(self, texto: str) -> str:
        return await self._pedir(self.complejizar_prompt, texto)


class Sala:
    """Estado de la llamada en curso: clientes conectados y respuestas pendientes de decir."""

    def __init__(self):
        self.clientes: set[WebSocket] = set()
        self.respuestas: asyncio.Queue[str] = asyncio.Queue()
        self.traductor = Traductor()

    async def enviar(self, msg: dict) -> None:
        for ws in list(self.clientes):
            try:
                await ws.send_text(json.dumps(msg, ensure_ascii=False))
            except Exception:
                self.clientes.discard(ws)

    async def ejecutivo_dijo(self, texto: str) -> None:
        try:
            simple = await self.traductor.simplificar(texto)
        except Exception:
            log.exception("No se pudo simplificar; se manda el texto original")
            simple = None
        await self.enviar({"tipo": "ejecutivo_dice", "texto": texto, "simple": simple})

    async def cliente_dijo(self, texto: str) -> None:
        texto = texto.strip()[:MAX_TEXTO]
        if not texto:
            return
        try:
            frase = await self.traductor.complejizar(texto)
        except Exception:
            log.exception("No se pudo complejizar; se dice el texto original")
            frase = texto
        await self.respuestas.put(frase or texto)

    def respuesta_pendiente(self) -> str | None:
        try:
            return self.respuestas.get_nowait()
        except asyncio.QueueEmpty:
            return None

    def reiniciar(self) -> None:
        """Nueva llamada: se descartan respuestas viejas."""
        self.respuestas = asyncio.Queue()


sala = Sala()


@router.websocket("/cliente")
async def cliente(ws: WebSocket) -> None:
    """Canal con la app del cliente sordo. TODO(auth): exigir token antes de desplegar (A4)."""
    await ws.accept()
    sala.clientes.add(ws)
    try:
        while True:
            try:
                msg = json.loads(await ws.receive_text())
            except ValueError:
                continue
            if isinstance(msg, dict) and msg.get("tipo") == "cliente_dice" and isinstance(msg.get("texto"), str):
                await sala.cliente_dijo(msg["texto"])
    except WebSocketDisconnect:
        pass
    finally:
        sala.clientes.discard(ws)


@router.get("/prueba")
def prueba() -> FileResponse:
    """Chat mínimo del cliente para probar sin la PWA. TODO(v1): sacar cuando apps/web use /twilio/cliente."""
    return FileResponse(Path(__file__).parent / "static" / "prueba.html")
