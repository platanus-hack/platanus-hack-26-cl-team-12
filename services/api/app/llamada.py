"""Plan C de v1: estado de la llamada, traducción con Claude y canal con la app del cliente.

Ejecutivo (teléfono) ⇄ Twilio <Gather>/<Say> ⇄ /twilio/* (twilio_media.py) ⇄ este módulo ⇄ WS /twilio/cliente ⇄ PWA
Mensajes del WebSocket con el cliente: los de docs/contrato.md (`ejecutivo_dice`, `cliente_dice`, `glosas_cliente`, `cliente_dijo`, `estado`).

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
        simple, opciones = None, []
        try:
            r = await self.traductor.simplificar(texto)
            simple, opciones = recortar(r.simple), list(r.opciones)
        except Exception:
            log.exception("No se pudo simplificar; se manda el texto original")
        await self.enviar({"tipo": "ejecutivo_dice", "texto": recortar(texto), "simple": simple, "opciones": opciones})

    async def _cliente_dice_frase(self, frase: str) -> None:
        """Lo que el cliente dijo ya convertido: se le muestra en la app (`cliente_dijo`) y queda listo para decirse por voz."""
        frase = recortar(frase)
        await self.enviar({"tipo": "cliente_dijo", "texto": frase})
        await self.respuestas.put(self.traductor.para_voz(frase))

    async def cliente_dijo(self, texto: str) -> None:
        texto = texto.strip()[:MAX_TEXTO]
        if not texto:
            return
        try:
            frase = await self.traductor.complejizar(texto)
        except Exception:
            log.exception("No se pudo complejizar; se dice el texto original")
            frase = texto
        await self._cliente_dice_frase(frase or texto)

    async def cliente_senio(self, glosas: list[str]) -> None:
        """v3: el cliente firmó frente a la cámara (`glosas_cliente`). Las glosas se convierten en una frase y se dice por voz."""
        validas = self.traductor.glosas_conocidas(glosas)
        if not validas:
            return
        try:
            frase = await self.traductor.glosas_a_espanol(validas)
        except Exception:
            log.exception("No se pudo convertir las glosas; se dicen tal cual")
            frase = " ".join(g.lower() for g in validas)
        await self._cliente_dice_frase(frase or " ".join(g.lower() for g in validas))

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
            if not isinstance(msg, dict):
                continue
            if msg.get("tipo") == "cliente_dice" and isinstance(msg.get("texto"), str):
                await sala.cliente_dijo(msg["texto"])
            elif msg.get("tipo") == "glosas_cliente" and isinstance(msg.get("glosas"), list):
                await sala.cliente_senio(msg["glosas"])
    except WebSocketDisconnect:
        pass
    finally:
        sala.clientes.discard(ws)


@router.get("/prueba")
def prueba() -> FileResponse:
    """Chat mínimo del cliente para probar sin la PWA. TODO(v1): sacar cuando apps/web use /twilio/cliente."""
    return FileResponse(Path(__file__).parent / "static" / "prueba.html")
