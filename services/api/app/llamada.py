"""Plan C de v1: estado de la llamada, traducción con Claude y canal con la app del cliente.

Ejecutivo (teléfono) ⇄ Twilio <Gather>/<Say> ⇄ /twilio/* (twilio_media.py) ⇄ este módulo ⇄ WS /twilio/cliente ⇄ PWA
Mensajes del WebSocket con el cliente: los de docs/contrato.md (`ejecutivo_dice`, `glosas_para_senar`, `cliente_dice`,
`estado`).

TODO(v1): una sola llamada a la vez (demo). Para varias, indexar `Sala` por CallSid y unirla al token del cliente.
"""

import asyncio
import hmac
import json
import logging
import os
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

from app.config import es_produccion
from app.traductor import MAX_TEXTO, Traductor, recortar

log = logging.getLogger("puente.llamada")
router = APIRouter(prefix="/twilio")


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
        """Texto simple (v2) y señas (v4) en paralelo, como el agente: el texto no espera a las señas."""
        await asyncio.gather(self._texto_simple(texto), self._senas(texto))

    async def _texto_simple(self, texto: str) -> None:
        simple, opciones = None, []
        try:
            r = await self.traductor.simplificar(texto)
            simple, opciones = recortar(r.simple), list(r.opciones)
        except Exception:
            log.exception("No se pudo simplificar; se manda el texto original")
        await self.enviar({"tipo": "ejecutivo_dice", "texto": recortar(texto), "simple": simple, "opciones": opciones})

    async def _senas(self, texto: str) -> None:
        try:
            r = await self.traductor.a_glosas(texto)
        except Exception:
            log.exception("No se pudo traducir a señas; queda solo el texto")
            return
        if r.glosas:
            await self.enviar({"tipo": "glosas_para_senar", "glosas": r.glosas, "subtitulo": recortar(r.subtitulo)})

    async def cliente_dijo(self, texto: str) -> None:
        texto = texto.strip()[:MAX_TEXTO]
        if not texto:
            return
        try:
            frase = await self.traductor.complejizar(texto)
        except Exception:
            log.exception("No se pudo complejizar; se dice el texto original")
            frase = texto
        await self.respuestas.put(self.traductor.para_voz(frase or texto))

    def respuesta_pendiente(self) -> str | None:
        try:
            return self.respuestas.get_nowait()
        except asyncio.QueueEmpty:
            return None

    def reiniciar(self) -> None:
        """Nueva llamada: se descartan respuestas viejas."""
        self.respuestas = asyncio.Queue()


sala = Sala()


def token_valido(token: str | None) -> bool:
    """Con `CLIENTE_WS_TOKEN`, el WebSocket exige `?token=` igual. Vacío: abierto en dev, cerrado en producción."""
    esperado = os.getenv("CLIENTE_WS_TOKEN", "")
    if not esperado:
        if es_produccion():
            log.error("CLIENTE_WS_TOKEN vacío en producción: se rechaza el WebSocket /twilio/cliente")
            return False
        return True
    return hmac.compare_digest((token or "").encode(), esperado.encode())


@router.websocket("/cliente")
async def cliente(ws: WebSocket) -> None:
    """Canal con la app del cliente sordo. Exige `?token=CLIENTE_WS_TOKEN` cuando está configurado (A4)."""
    if not token_valido(ws.query_params.get("token")):
        await ws.close(code=1008)  # policy violation
        return
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
