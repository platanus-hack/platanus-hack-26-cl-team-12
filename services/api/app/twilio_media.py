"""Plan B de v1 (docs/ARQUITECTURA.md §1.7): Twilio Media Streams directo a FastAPI, sin LiveKit.

Flujo: Twilio llama al ejecutivo → pide TwiML a `POST /twilio/voz` → abre un WebSocket a `/twilio/media`
con el audio de la llamada (μ-law 8 kHz, base64) y reproduce lo que le devolvemos por el mismo socket.

Paso 1 (este archivo): ECO. Devolvemos el mismo audio para comprobar que el trial de Twilio deja ir y volver.
TODO(v1): reemplazar el eco por STT → translator (Claude) → TTS y avisar a la PWA por WebSocket.
"""

import json
import logging
import os
from xml.sax.saxutils import escape, quoteattr

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import Response

log = logging.getLogger("puente.twilio")
router = APIRouter(prefix="/twilio")


def public_base(request: Request) -> str:
    """URL pública de la API (túnel ngrok o deploy). Twilio necesita direcciones absolutas."""
    return os.getenv("PUBLIC_BASE_URL", "").split("#")[0].strip().rstrip("/") or str(request.base_url).rstrip("/")


def media_ws_url(request: Request) -> str:
    return public_base(request).replace("https://", "wss://").replace("http://", "ws://") + "/twilio/media"


@router.post("/voz")
async def voz(request: Request) -> Response:
    """TwiML que Twilio pide cuando el ejecutivo contesta.

    TODO(auth): validar la firma `X-Twilio-Signature` antes de desplegar (A4).
    """
    url = quoteattr(media_ws_url(request))
    if request.query_params.get("modo") == "gather":
        cuerpo = gather_twiml("Hola, esta es una prueba de Puente. Di una frase y te la repito.", public_base(request))
    elif request.query_params.get("modo") == "start":
        # Solo ida (Twilio → nosotros); respondemos con <Say>. Por si el trial bloquea <Connect><Stream>.
        cuerpo = f'<Start><Stream url={url}/></Start><Say language="es-MX">Prueba de Puente. Habla después del tono.</Say><Pause length="20"/>'
    else:
        cuerpo = f"<Connect><Stream url={url}/></Connect>"
    twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response>{cuerpo}</Response>'
    return Response(twiml, media_type="application/xml")


def gather_twiml(decir: str, base: str) -> str:
    """Plan C (gratis en trial): Twilio transcribe al ejecutivo y nos manda el texto a /twilio/turno."""
    return (
        f'<Gather input="speech" language="es-MX" speechTimeout="auto" action={quoteattr(base + "/twilio/turno")} method="POST">'
        f'<Say language="es-MX">{escape(decir)}</Say></Gather>'
        f'<Redirect method="POST">{escape(base)}/twilio/voz?modo=gather</Redirect>'  # si no habló, vuelve a escuchar
    )


@router.post("/turno")
async def turno(request: Request) -> Response:
    """Llega lo que dijo el ejecutivo, ya transcrito por Twilio.

    Paso de prueba: se lo repetimos. TODO(v1): simplificar con Claude → PWA, y decir la respuesta del cliente.
    """
    form = await request.form()
    texto = str(form.get("SpeechResult", "")).strip()
    log.warning("Ejecutivo dijo: %r (confianza %s)", texto, form.get("Confidence"))
    decir = f"Entendí: {texto}. Di otra frase." if texto else "No te escuché. Intenta de nuevo."
    return Response(f'<?xml version="1.0" encoding="UTF-8"?><Response>{gather_twiml(decir, public_base(request))}</Response>',
                    media_type="application/xml")


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
