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
import time
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
        # Llamada en curso y si Twilio está en una pausa larga esperando al cliente (ver interrumpir_pausa).
        self.call_sid: str | None = None
        self.en_pausa_larga = False
        # Respuesta ya devuelta a Twilio pero sin confirmar (su audio aún no se descarga): ver respuesta_pendiente.
        self.en_entrega: tuple[str, str, str | None] | None = None

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
        t = time.perf_counter()
        audio_id = await voz.preparar(para_decir)
        await self.respuestas.put((para_decir, frase, audio_id))
        log.info("respuesta en cola: %d caracteres, voz %s en %d ms (audio %s) | cola=%d | en_pausa_larga=%s",
                 len(para_decir), "chilena" if audio_id else "Twilio", (time.perf_counter() - t) * 1000,
                 (audio_id or "-")[:6], self.respuestas.qsize(), self.en_pausa_larga)
        if self.en_pausa_larga:  # Twilio está en <Pause> largo: se interrumpe para que la respuesta suene al tiro
            self.en_pausa_larga = False
            await asyncio.to_thread(interrumpir_pausa, self.call_sid)

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
        t = time.perf_counter()
        try:
            frase = await self.traductor.complejizar(texto)
            log.info("complejizar: %d → %d caracteres en %d ms", len(texto), len(frase or ""), (time.perf_counter() - t) * 1000)
        except Exception:
            log.exception("No se pudo complejizar; se dice el texto original")
            frase = texto
        await self._cliente_dice_frase(frase or texto)

    async def cliente_senio(self, glosas: list[str]) -> None:
        """v3: el cliente firmó frente a la cámara (`glosas_cliente`). Las glosas se convierten en una frase y se dice por voz."""
        validas = self.traductor.glosas_conocidas(glosas)
        if not validas:
            return
        log.info("señas recibidas: %d glosas, %d conocidas", len(glosas), len(validas))
        t = time.perf_counter()
        try:
            frase = await self.traductor.glosas_a_espanol(validas)
            log.info("glosas_a_espanol: %d caracteres en %d ms", len(frase or ""), (time.perf_counter() - t) * 1000)
        except Exception:
            log.exception("No se pudo convertir las glosas; se dicen tal cual")
            frase = " ".join(g.lower() for g in validas)
        await self._cliente_dice_frase(frase or " ".join(g.lower() for g in validas))

    async def respuesta_pendiente(self, esperar_s: float = 0) -> tuple[str, str | None] | None:
        """La siguiente respuesta del cliente para decir por voz, esperando hasta `esperar_s` a que llegue.

        Con audio (voz chilena), la respuesta NO se da por entregada al devolverla: queda `en_entrega` hasta que Twilio
        descarga su audio (confirmar_audio). Al interrumpir la pausa, Twilio hace dos consultas seguidas y descarta la
        primera: si esa se llevaba la respuesta, se perdía (medido en fix/debug). Ahora la segunda la vuelve a entregar.
        Esperar aquí (en vez de que Twilio pregunte cada 2 s) ahorra consultas.
        """
        if self.en_entrega is not None:  # entregada antes pero Twilio no la reprodujo: se reintenta
            para_decir, _, audio_id = self.en_entrega
            log.info("reentrega de la respuesta pendiente (audio %s)", (audio_id or "-")[:6])
            return para_decir, audio_id
        try:
            if esperar_s > 0:
                item = await asyncio.wait_for(self.respuestas.get(), timeout=esperar_s)
            else:
                item = self.respuestas.get_nowait()
        except (asyncio.QueueEmpty, asyncio.TimeoutError):
            return None
        para_decir, pantalla, audio_id = item
        if audio_id:
            self.en_entrega = item  # se confirma cuando Twilio descarga el audio
        else:  # voz de Twilio (<Say>): no hay forma de confirmar, se da por entregada
            await self.enviar({"tipo": "cliente_dijo", "texto": pantalla})
        return para_decir, audio_id

    async def confirmar_audio(self, audio_id: str) -> None:
        """Twilio descargó el audio: la respuesta empieza a sonar. Recién ahí se da por entregada y la app la muestra."""
        if self.en_entrega is not None and self.en_entrega[2] == audio_id:
            _, pantalla, _ = self.en_entrega
            self.en_entrega = None
            log.info("respuesta entregada: Twilio descargó el audio %s", audio_id[:6])
            await self.enviar({"tipo": "cliente_dijo", "texto": pantalla})

    def reiniciar(self) -> None:
        """Nueva llamada: se descartan respuestas viejas y sus audios."""
        self.respuestas = asyncio.Queue()
        self.call_sid, self.en_pausa_larga, self.en_entrega = None, False, None
        voz.olvidar_respuestas()


def interrumpir_pausa(call_sid: str | None) -> None:
    """Corta el <Pause> largo de la llamada en curso: Twilio pide de inmediato /twilio/espera, que ya tiene la respuesta.

    Si falla (sin claves, trial que no lo permita), no pasa nada grave: la respuesta suena al terminar la pausa.
    """
    base = os.getenv("PUBLIC_BASE_URL", "").split("#")[0].strip().rstrip("/")
    cuenta, token = os.getenv("TWILIO_ACCOUNT_SID", ""), os.getenv("TWILIO_AUTH_TOKEN", "")
    if not (call_sid and base and cuenta and token):
        return
    try:
        from twilio.rest import Client

        Client(cuenta, token).calls(call_sid).update(url=f"{base}/twilio/espera?n=0", method="POST")
        log.info("pausa interrumpida (calls.update → /twilio/espera?n=0) para %s…", call_sid[:8])
    except Exception as e:
        log.warning("No se pudo interrumpir la pausa (%s); la respuesta suena al terminar la pausa", type(e).__name__)


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
            if isinstance(msg, dict):
                log.info("WS ← app: %s%s", msg.get("tipo"), f" ({len(msg['glosas'])} glosas)" if isinstance(msg.get("glosas"), list) else "")
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
