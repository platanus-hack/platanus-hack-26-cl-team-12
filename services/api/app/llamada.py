"""Plan C de v1: estado de la llamada, traducción con Claude y canal con la app del cliente.

Ejecutivo (teléfono) ⇄ Twilio <Gather>/<Say> ⇄ /twilio/* (twilio_media.py) ⇄ este módulo ⇄ WS /twilio/cliente ⇄ PWA
Mensajes del WebSocket con el cliente: los de docs/contrato.md (`ejecutivo_dice`, `glosas_para_senar`, `cliente_dice`,
`glosas_cliente`, `cliente_dijo`, `estado`).

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
from app.voz import voz

log = logging.getLogger("puente.llamada")
router = APIRouter(prefix="/twilio")


class Sala:
    """Estado de la llamada en curso: clientes conectados y respuestas pendientes de decir."""

    def __init__(self):
        self.clientes: set[WebSocket] = set()
        # (texto para la voz, frase para mostrar en la app, id del audio chileno o None). Se avisa a la app recién
        # cuando empieza a sonar (respuesta_pendiente). El audio de ElevenLabs se genera apenas responde el cliente.
        self.respuestas: asyncio.Queue[tuple[str, str, str | None]] = asyncio.Queue()
        self.traductor = Traductor()
        # CallSid de las llamadas que creó este servidor (POST /llamadas). Sirve para aceptar el primer pedido del
        # trial de Twilio, que llega por TwilioProxy SIN firma (ver verificar_firma en twilio_media.py).
        self.llamadas_creadas: set[str] = set()

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

    async def _cliente_dice_frase(self, frase: str) -> None:
        """Lo que el cliente dijo ya convertido: queda listo para decirse por voz. La app lo ve cuando empieza a sonar."""
        frase = recortar(frase)
        para_decir = self.traductor.para_voz(frase)
        await self.respuestas.put((para_decir, frase, await voz.preparar(para_decir)))

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

    async def respuesta_pendiente(self, esperar_s: float = 0) -> tuple[str, str | None] | None:
        """La siguiente respuesta del cliente para decir por voz, esperando hasta `esperar_s` a que llegue.

        Al sacarla empieza a sonar: ahí se le manda a la app la frase (`cliente_dijo`) para que se vea a la par del audio.
        Esperar aquí (en vez de que Twilio vuelva a preguntar cada 2 s) ahorra pedidos: el trial de Twilio corta la
        llamada después de ~10 pedidos de TwiML (ver BITACORA 2026-11-22).
        """
        try:
            if esperar_s > 0:
                item = await asyncio.wait_for(self.respuestas.get(), timeout=esperar_s)
            else:
                item = self.respuestas.get_nowait()
        except (asyncio.QueueEmpty, asyncio.TimeoutError):
            return None
        para_decir, pantalla, audio_id = item
        await self.enviar({"tipo": "cliente_dijo", "texto": pantalla})
        return para_decir, audio_id

    def reiniciar(self) -> None:
        """Nueva llamada: se descartan respuestas viejas y sus audios."""
        self.respuestas = asyncio.Queue()
        voz.olvidar_respuestas()


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
