"""Plan B de v1 (docs/ARQUITECTURA.md §1.7): Twilio Media Streams directo a FastAPI, sin LiveKit.

Flujo: Twilio llama al ejecutivo → pide TwiML a `POST /twilio/voz` → abre un WebSocket a `/twilio/media`
con el audio de la llamada (μ-law 8 kHz, base64) y reproduce lo que le devolvemos por el mismo socket.

Paso 1 (este archivo): ECO. Devolvemos el mismo audio para comprobar que el trial de Twilio deja ir y volver.
TODO(v1): reemplazar el eco por STT → translator (Claude) → TTS y avisar a la PWA por WebSocket.
"""

import json
import logging
import os
from xml.sax.saxutils import quoteattr

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import Response

log = logging.getLogger("puente.twilio")
router = APIRouter(prefix="/twilio")


def media_ws_url(request: Request) -> str:
    """URL pública del WebSocket. Twilio necesita wss:// y la URL del túnel (ngrok) o del deploy."""
    base = os.getenv("PUBLIC_BASE_URL", "").split("#")[0].strip().rstrip("/") or str(request.base_url).rstrip("/")
    return base.replace("https://", "wss://").replace("http://", "ws://") + "/twilio/media"


@router.post("/voz")
async def voz(request: Request) -> Response:
    """TwiML que Twilio pide cuando el ejecutivo contesta.

    TODO(auth): validar la firma `X-Twilio-Signature` antes de desplegar (A4).
    """
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f"<Response><Connect><Stream url={quoteattr(media_ws_url(request))}/></Connect></Response>"
    )
    return Response(twiml, media_type="application/xml")


@router.websocket("/media")
async def media(ws: WebSocket) -> None:
    """Recibe el audio de la llamada y, por ahora, lo devuelve tal cual (eco)."""
    await ws.accept()
    stream_sid = None
    paquetes = 0
    try:
        while True:
            msg = json.loads(await ws.receive_text())
            evento = msg.get("event")
            if evento == "start":
                stream_sid = msg["start"]["streamSid"]
                log.warning("Twilio stream iniciado: %s", stream_sid)
            elif evento == "media" and stream_sid:
                paquetes += 1
                await ws.send_text(
                    json.dumps({"event": "media", "streamSid": stream_sid, "media": {"payload": msg["media"]["payload"]}})
                )
            elif evento == "stop":
                break
    except WebSocketDisconnect:
        pass
    log.warning("Twilio stream terminado: %s (%d paquetes de audio)", stream_sid, paquetes)
