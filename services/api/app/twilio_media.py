"""Telefonía de v1 sin LiveKit: Twilio llama al ejecutivo y conversa por turnos (plan C, funciona en trial).

Turno del ejecutivo:  /twilio/escuchar (<Gather speech>) → /twilio/turno con el texto → Claude simplifica → PWA.
Turno del cliente:    /twilio/espera repite una pausa hasta que el cliente responde en la PWA → <Play> → escuchar.

Voz: lo que escucha el ejecutivo es la voz chilena de ElevenLabs (<Play> de /twilio/audio/{id}.mp3, app/voz.py).
Sin ELEVENLABS_API_KEY o si ElevenLabs falla, se usa la voz de Twilio (<Say> es-MX).

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

from app.config import es_produccion
from app.llamada import sala
from app.traductor import load_escenario
from app.voz import voz as voz_chilena

log = logging.getLogger("puente.twilio")

IDIOMA = 'language="es-MX"'
SALUDO = (
    "Hola. Le habla Puente, un servicio de interpretación para una persona sorda. "
    "Hable después de este mensaje y espere unos segundos la respuesta."
)
# Pistas para el reconocimiento de voz de Twilio (sin esto, "RUT" se transcribe como "fútbol"): los términos del
# escenario (los mismos que recibe Deepgram en el agente) más algunos que solo le hacen falta a Twilio.
_PISTAS_TWILIO = ["hora", "hora médica", "médico", "doctor", "previsión", "copago", "dígito verificador"]
PISTAS = ", ".join(dict.fromkeys([*load_escenario().stt_keyterms, *_PISTAS_TWILIO]))
# Si el cliente no respondió en la espera larga, Twilio recibe UNA secuencia de (silencio + aviso) que dura hasta
# ~9 min: se espera hasta que el cliente aprieta Enviar, y ahí Sala la interrumpe (calls.update). Una sola consulta:
# el trial corta tras ~10 consultas por llamada y a los 10 minutos.
SILENCIO_S = 20  # silencio entre avisos "la persona sigue respondiendo"
VUELTAS = 26  # ~26 × (20 s + ~3 s de aviso) ≈ 9 min


def espera_larga_s() -> float:
    """Cuánto retiene el servidor cada pedido de /twilio/espera esperando la respuesta del cliente (Twilio espera
    hasta 15 s por un webhook). Menos pedidos por llamada: el trial de Twilio corta después de ~10."""
    try:
        return max(0.0, min(float(os.getenv("TWILIO_ESPERA_S", "10")), 12.0))
    except ValueError:
        return 10.0
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
    if not firma and _llamada_propia(params):
        # Cuenta trial: el primer pedido pasa por TwilioProxy (el aviso "trial account") y llega SIN firma.
        # Se acepta solo si es una llamada que creó este servidor (CallSid aleatorio de 34 caracteres) y de esta cuenta.
        return
    if not RequestValidator(auth_token).validate(url, params, firma):
        log.warning("Firma de Twilio inválida para %s", url)
        raise HTTPException(403, "Firma de Twilio inválida")


def _llamada_propia(params: dict) -> bool:
    cuenta = os.getenv("TWILIO_ACCOUNT_SID", "")
    return bool(cuenta) and params.get("AccountSid") == cuenta and params.get("CallSid") in sala.llamadas_creadas


router = APIRouter(prefix="/twilio")
FIRMADO = [Depends(verificar_firma)]  # solo en los POST: en un router afectaría también al WebSocket /media


def twiml(cuerpo: str) -> Response:
    return Response(f'<?xml version="1.0" encoding="UTF-8"?><Response>{cuerpo}</Response>', media_type="application/xml")


def decir(texto: str) -> str:
    return f"<Say {IDIOMA}>{escape(texto)}</Say>"


def reproducir(base: str, texto: str, audio_id: str | None) -> str:
    """Voz chilena (<Play>) si hay audio de ElevenLabs; si no, la voz de Twilio (<Say>)."""
    if audio_id:
        return f"<Play>{escape(f'{base}/twilio/audio/{audio_id}.mp3')}</Play>"
    return decir(texto)


async def hablar(base: str, texto: str) -> str:
    """Frase fija del sistema (sin datos personales): el audio se genera una vez y se reutiliza."""
    return reproducir(base, texto, await voz_chilena.preparar(texto, fija=True))


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
    sala.call_sid = str((await request.form()).get("CallSid") or "") or None
    await sala.enviar({"tipo": "estado", "valor": "llamada_iniciada"})
    base = public_base(request)
    return twiml(escuchar(base, await hablar(base, SALUDO)))


@router.post("/escuchar", dependencies=FIRMADO)
async def escuchar_de_nuevo(request: Request) -> Response:
    return twiml(escuchar(public_base(request)))


@router.post("/turno", dependencies=FIRMADO)
async def turno(request: Request) -> Response:
    """Llega lo que dijo el ejecutivo, transcrito por Twilio. Se traduce en segundo plano y se espera al cliente."""
    form = await request.form()
    texto = str(form.get("SpeechResult", "")).strip()
    base = public_base(request)
    # Sin el texto: puede traer RUT o datos de salud (seguridad-datos-cl, art. 14 bis).
    log.info("Turno del ejecutivo: %d caracteres (confianza %s)", len(texto), form.get("Confidence"))
    if not texto:
        return twiml(escuchar(base))
    tarea = asyncio.create_task(sala.ejecutivo_dijo(texto))  # Twilio no espera a Claude
    _tareas.add(tarea)
    tarea.add_done_callback(_tareas.discard)
    return twiml(await hablar(base, "Un momento, por favor.") + ir_a(base, "/twilio/espera?n=0"))


@router.post("/espera", dependencies=FIRMADO)
async def espera(request: Request) -> Response:
    """Mientras el cliente escribe: pausa corta y vuelve a revisar. Cuando hay respuesta, se dice y se escucha."""
    base = public_base(request)
    sala.en_pausa_larga = False  # Twilio volvió a preguntar: ya no está en pausa
    respuesta = await sala.respuesta_pendiente(espera_larga_s())
    if respuesta:
        texto, audio_id = respuesta
        log.info("Respuesta del cliente lista: %d caracteres (voz %s)", len(texto), "chilena" if audio_id else "Twilio")
        return twiml(reproducir(base, texto, audio_id) + escuchar(base))
    try:
        n = int(request.query_params.get("n", "0")) + 1
    except ValueError:
        n = 1
    aviso = await hablar(base, "La persona sigue respondiendo, espere por favor.")
    # Espera hasta que el cliente aprieta Enviar: Sala corta esta secuencia con la API de Twilio y la respuesta
    # suena al tiro. Si no se pudiera interrumpir, al terminar vuelve a /twilio/espera, que ya tiene la respuesta.
    sala.en_pausa_larga = True
    return twiml(f'<Pause length="{SILENCIO_S}"/>{aviso}' * VUELTAS + ir_a(base, f"/twilio/espera?n={n}"))


@router.get("/audio/{audio_id}.mp3")
async def audio(audio_id: str) -> Response:
    """Twilio descarga aquí el audio de <Play>. Sin firma (Twilio no firma estas descargas): el id es aleatorio
    de 128 bits y el audio de una respuesta vence a los pocos minutos (app/voz.py)."""
    mp3 = voz_chilena.audio(audio_id)
    if mp3 is None:
        raise HTTPException(404, "Audio no disponible")
    return Response(mp3, media_type="audio/mpeg", headers={"Cache-Control": "no-store"})


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
