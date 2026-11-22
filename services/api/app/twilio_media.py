"""Telefonía de v1 sin LiveKit: Twilio llama al ejecutivo y conversa por turnos (plan C, funciona en trial).

Turno del ejecutivo:  /twilio/escuchar (<Gather speech>) → /twilio/turno con el texto → Claude simplifica → PWA.
Turno del cliente:    /twilio/espera repite una pausa hasta que el cliente responde en la PWA → <Say> → escuchar.

Probado en el trial de Twilio (ver BITACORA): <Say> y <Gather speech> funcionan; Media Streams y SIP no.
`/twilio/media` (audio en vivo, plan B) queda solo para cuando se pague el upgrade.
Todos los POST validan `X-Twilio-Signature` con TWILIO_AUTH_TOKEN (A4); sin token configurado no se valida (dev).
"""

import asyncio
import json
import logging
import os
from xml.sax.saxutils import escape, quoteattr

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import Response

from app.llamada import sala
from app.traductor import es_produccion

log = logging.getLogger("puente.twilio")

IDIOMA = 'language="es-MX"'
SALUDO = (
    "Hola. Le habla Puente, un servicio de interpretación para una persona sorda. "
    "Hable después de este mensaje y espere unos segundos la respuesta."
)
# Pistas para el reconocimiento de voz de Twilio (sin esto, "RUT" se transcribe como "fútbol").
PISTAS = "RUT, Fonasa, Isapre, hora, hora médica, médico, doctor, consulta, agendar, previsión, bono, copago, rut, dígito verificador"
ESPERA_S = 2  # segundos entre revisiones de la respuesta del cliente
AVISO_CADA = 10  # cada ~20 s de espera se le avisa al ejecutivo que el cliente sigue escribiendo
_tareas: set[asyncio.Task] = set()


def public_base(request: Request) -> str:
    """URL pública de la API (túnel ngrok o deploy). Twilio necesita direcciones absolutas."""
    return os.getenv("PUBLIC_BASE_URL", "").split("#")[0].strip().rstrip("/") or str(request.base_url).rstrip("/")


async def verificar_firma(request: Request) -> None:
    """Rechaza POST que no vengan de Twilio. La URL firmada es la pública (ngrok/Render), no la interna."""
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
    if not auth_token:
        if es_produccion():  # fallar cerrado: sin token no hay cómo saber que el POST viene de Twilio
            log.error("TWILIO_AUTH_TOKEN vacío en producción: se rechazan los POST a /twilio/*")
            raise HTTPException(503, "TWILIO_AUTH_TOKEN no configurado")
        log.warning("TWILIO_AUTH_TOKEN vacío: no se valida X-Twilio-Signature (solo para desarrollo)")
        return
    from twilio.request_validator import RequestValidator

    url = public_base(request) + request.url.path + (f"?{request.url.query}" if request.url.query else "")
    params = dict(await request.form())
    firma = request.headers.get("X-Twilio-Signature", "")
    if not RequestValidator(auth_token).validate(url, params, firma):
        log.warning("Firma de Twilio inválida para %s", url)
        raise HTTPException(403, "Firma de Twilio inválida")


router = APIRouter(prefix="/twilio")
FIRMADO = [Depends(verificar_firma)]  # solo en los POST: en un router afectaría también al WebSocket /media


def twiml(cuerpo: str) -> Response:
    return Response(f'<?xml version="1.0" encoding="UTF-8"?><Response>{cuerpo}</Response>', media_type="application/xml")


def decir(texto: str) -> str:
    return f"<Say {IDIOMA}>{escape(texto)}</Say>"


def ir_a(base: str, ruta: str) -> str:
    return f'<Redirect method="POST">{escape(base + ruta)}</Redirect>'


def escuchar(base: str, antes: str = "") -> str:
    """Escucha al ejecutivo; si no habla, vuelve a escuchar."""
    return (
        f'<Gather input="speech" {IDIOMA} hints={quoteattr(PISTAS)} speechTimeout="auto" action={quoteattr(base + "/twilio/turno")} method="POST">'
        f"{antes}</Gather>{ir_a(base, '/twilio/escuchar')}"
    )


@router.post("/voz", dependencies=FIRMADO)
async def voz(request: Request) -> Response:
    """TwiML inicial cuando el ejecutivo contesta. `?modo=stream` usa audio en vivo (requiere cuenta pagada)."""
    if request.query_params.get("modo") == "stream":
        url = public_base(request).replace("https://", "wss://").replace("http://", "ws://") + "/twilio/media"
        return twiml(f"<Connect><Stream url={quoteattr(url)}/></Connect>")
    sala.reiniciar()
    await sala.enviar({"tipo": "estado", "valor": "llamada_iniciada"})
    return twiml(escuchar(public_base(request), decir(SALUDO)))


@router.post("/escuchar", dependencies=FIRMADO)
async def escuchar_de_nuevo(request: Request) -> Response:
    return twiml(escuchar(public_base(request)))


@router.post("/turno", dependencies=FIRMADO)
async def turno(request: Request) -> Response:
    """Llega lo que dijo el ejecutivo, transcrito por Twilio. Se traduce en segundo plano y se espera al cliente."""
    form = await request.form()
    texto = str(form.get("SpeechResult", "")).strip()
    base = public_base(request)
    log.warning("Ejecutivo dijo: %r (confianza %s)", texto, form.get("Confidence"))
    if not texto:
        return twiml(escuchar(base))
    tarea = asyncio.create_task(sala.ejecutivo_dijo(texto))  # Twilio no espera a Claude
    _tareas.add(tarea)
    tarea.add_done_callback(_tareas.discard)
    return twiml(decir("Un momento, por favor.") + ir_a(base, "/twilio/espera?n=0"))


@router.post("/espera", dependencies=FIRMADO)
async def espera(request: Request) -> Response:
    """Mientras el cliente escribe: pausa corta y vuelve a revisar. Cuando hay respuesta, se dice y se escucha."""
    base = public_base(request)
    respuesta = sala.respuesta_pendiente()
    if respuesta:
        log.warning("Se le dice al ejecutivo: %r", respuesta)
        return twiml(decir(respuesta) + escuchar(base))
    try:
        n = int(request.query_params.get("n", "0")) + 1
    except ValueError:
        n = 1
    aviso = decir("La persona sigue escribiendo, espere por favor.") if n % AVISO_CADA == 0 else ""
    return twiml(f'{aviso}<Pause length="{ESPERA_S}"/>' + ir_a(base, f"/twilio/espera?n={n}"))


@router.post("/estado", dependencies=FIRMADO)
async def estado(request: Request) -> Response:
    """statusCallback de Twilio: avisa a la PWA cuando la llamada termina."""
    form = await request.form()
    if form.get("CallStatus") in {"completed", "busy", "failed", "no-answer", "canceled"}:
        await sala.enviar({"tipo": "estado", "valor": "llamada_terminada"})
    return Response(status_code=204)


@router.websocket("/media")
async def media(ws: WebSocket) -> None:
    """Plan B (solo con cuenta pagada): recibe el audio en vivo y por ahora lo devuelve (eco)."""
    await ws.accept()
    stream_sid = None
    try:
        while True:
            msg = json.loads(await ws.receive_text())
            if msg.get("event") == "start":
                stream_sid = msg["start"]["streamSid"]
            elif msg.get("event") == "media" and stream_sid:
                await ws.send_text(
                    json.dumps({"event": "media", "streamSid": stream_sid, "media": {"payload": msg["media"]["payload"]}})
                )
            elif msg.get("event") == "stop":
                break
    except WebSocketDisconnect:
        pass
