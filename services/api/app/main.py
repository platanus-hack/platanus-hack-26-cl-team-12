"""API de Puente (ADR-0005, ADR-0009, ADR-0011).

- /health          chequeo de vida (heredado del backend original).
- /token           token de LiveKit con permisos mínimos por rol.
- /llamadas        Twilio llama al ejecutivo (v1, plan C); la conversación sigue en /twilio/*.
- /glosses         diccionario de glosas (contrato de ADR-0001).
- /twilio/*        v1 sin LiveKit: Twilio conversa por turnos con el ejecutivo (app/twilio_media.py, app/llamada.py).

Swagger (solo en desarrollo): http://localhost:8000/docs  ·  ReDoc: /redoc  ·  esquema: /openapi.json
Se apaga con API_ENV=production (el Dockerfile ya lo fija) o con API_DOCS=0.
"""

import asyncio
import json
import os
import re
import tomllib
import uuid
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from app.config import es_produccion
from app.llamada import router as llamada_router
from app.llamada import sala
from app.traductor import DEFAULT_PATH
from app.twilio_media import router as twilio_router

load_dotenv()

GLOSSES_PATH = Path(os.getenv("GLOSSES_PATH", DEFAULT_PATH))  # el mismo diccionario que usa el traductor

ROL_CLIENTE = "cliente"
E164 = re.compile(r"\+[1-9]\d{7,14}")

API_DIR = Path(__file__).resolve().parents[1]


def docs_habilitados() -> bool:
    """Swagger/ReDoc solo en desarrollo: en producción no se expone el mapa de la API.
    API_DOCS (1/0) manda; si no está, se decide por API_ENV (defecto: development)."""
    explicito = (os.getenv("API_DOCS") or "").strip().lower()
    if explicito:  # vacío (`API_DOCS=` del .env.example) = no definido
        return explicito in ("1", "true", "si", "sí", "yes")
    return not es_produccion()


def version_api() -> str:
    try:
        return tomllib.loads((API_DIR / "pyproject.toml").read_text(encoding="utf-8"))["project"]["version"]
    except (OSError, KeyError, tomllib.TOMLDecodeError):
        return "0.0.0"


DESCRIPCION = """
API de **Puente**: llamadas telefónicas accesibles para personas sordas.

v1 (plan C, funciona con el trial de Twilio): la PWA abre el WebSocket `/twilio/cliente` y llama a
`POST /llamadas`. Twilio llama al ejecutivo y conversa por turnos (`/twilio/*`): lo que dice llega simplificado a
la PWA (`ejecutivo_dice`) y lo que escribe el cliente (`cliente_dice`) se le dice por voz. Mensajes: `docs/contrato.md`.

`/token` (LiveKit) queda para cuando se pague el upgrade de Twilio y se vuelva al plan con SIP.
"""

TAGS = [
    {"name": "sistema", "description": "Chequeo de vida del servicio."},
    {"name": "llamada", "description": "Entrar a la sala de LiveKit y llamar al ejecutivo por teléfono."},
    {"name": "glosas", "description": "Diccionario de glosas LSCh compartido (ADR-0001)."},
]

_docs = docs_habilitados()
app = FastAPI(
    title="Puente - llamadas accesibles",
    description=DESCRIPCION,
    version=version_api(),
    openapi_tags=TAGS,
    docs_url="/docs" if _docs else None,
    redoc_url="/redoc" if _docs else None,
    openapi_url="/openapi.json" if _docs else None,
)
app.add_middleware(
    CORSMiddleware,
    # En producción: CORS_ORIGINS=https://<tu-pwa>.vercel.app (lista separada por comas).
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(twilio_router)
app.include_router(llamada_router)


class ErrorResponse(BaseModel):
    detail: str = Field(description="Motivo del error, en español.")


def errores(*codigos: int) -> dict:
    """Respuestas de error documentadas en Swagger (todas con forma {"detail": "..."})."""
    textos = {
        403: "No permitido.",
        422: "Datos inválidos.",
        501: "Todavía no implementado.",
        503: "Servicio externo no configurado.",
    }
    return {c: {"model": ErrorResponse, "description": textos[c]} for c in codigos}


class HealthResponse(BaseModel):
    ok: bool = Field(examples=[True])


@app.get("/health", response_model=HealthResponse, tags=["sistema"], summary="Chequeo de vida")
def health() -> HealthResponse:
    return HealthResponse(ok=True)


class GlossEntry(BaseModel):
    """Una seña del diccionario. Fuente: packages/glosses/data/glosses.json (schema en gloss.schema.json)."""

    model_config = ConfigDict(extra="allow")  # campos nuevos del schema pasan sin romper la API (solo aditivo)

    gloss: str = Field(examples=["MÉDICO"], description="Glosa en MAYÚSCULAS.")
    category: str = Field(examples=["salud"])
    es: list[str] = Field(examples=[["médico", "doctor"]], description="Palabras en español.")
    classifierLabel: int = Field(description="Clase del modelo de reconocimiento (no se reordena).")
    clip: str | None = None
    animationId: str | None = None
    nonManual: str | None = Field(None, description="Rasgo no manual (ej. cejas fruncidas en preguntas).")
    validatedBy: str | None = None
    lexiconId: str | None = Field(None, description="Id en el glosario LSCh de origen (foto de la seña).")


class GlossDictionary(BaseModel):
    model_config = ConfigDict(extra="allow")

    version: int
    glosses: list[GlossEntry]


@app.get("/glosses", response_model=GlossDictionary, tags=["glosas"], summary="Diccionario de glosas LSCh")
def glosses() -> dict:
    return json.loads(GLOSSES_PATH.read_text(encoding="utf-8"))


class TokenResponse(BaseModel):
    url: str = Field(description="URL del servidor de LiveKit.", examples=["wss://puente.livekit.cloud"])
    token: str = Field(description="JWT de LiveKit (1 h, rol cliente, solo datos).")
    room: str = Field(description="Sala nueva y no adivinable.", examples=["puente-3f2a..."])
    identity: str = Field(examples=["cliente-1a2b3c4d5e6f"])


@app.post(
    "/token", response_model=TokenResponse, tags=["llamada"], summary="Token de LiveKit para el cliente",
    responses=errores(503),
)
def token() -> TokenResponse:
    """Token para la PWA del cliente (persona sorda).

    El servidor decide TODO: identidad, sala y rol. El cliente no envía nada, así no puede
    entrar a la sala de otra persona ni hacerse pasar por el agente o el ejecutivo.
    El ejecutivo nunca recibe token: entra por SIP (ver /llamadas).
    TODO(auth): exigir sesión (Supabase Auth, ADR-0009) y limitar la tasa por usuario antes de producción.
    """
    from livekit import api as lk

    url, key, secret = (os.getenv(k) for k in ("LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"))
    if not (url and key and secret):
        raise HTTPException(503, "LiveKit no configurado (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)")

    identity = f"cliente-{uuid.uuid4().hex[:12]}"
    room = f"puente-{uuid.uuid4().hex}"  # no adivinable
    # Mínimo privilegio: el cliente solo recibe y manda mensajes de datos (glosas/texto), sin publicar audio/video.
    grants = lk.VideoGrants(
        room_join=True, room=room, can_publish=False, can_subscribe=True, can_publish_data=True
    )
    jwt = (
        lk.AccessToken(key, secret)
        .with_identity(identity)
        .with_attributes({"role": ROL_CLIENTE})  # atributo asignado por el servidor; el agente lo verifica
        .with_grants(grants)
        .with_ttl(timedelta(hours=1))
        .to_jwt()
    )
    return TokenResponse(url=url, token=jwt, room=room, identity=identity)


class LlamadaRequest(BaseModel):
    numero: str | None = Field(
        None,
        description="Teléfono del ejecutivo en E.164. Debe estar en ALLOWED_DESTINATIONS. "
        "Si falta, se usa NUMERO_DEMO (los contactos de la app no tienen teléfono).",
        examples=["+56912345678"],
    )
    destino: str | None = Field(None, description="Contacto elegido en la app (solo informativo).", examples=["clinica"])
    room: str | None = Field(None, description="Sala de LiveKit (solo plan con SIP; en el plan C no se usa).")


class LlamadaResponse(BaseModel):
    sid: str = Field(description="Id de la llamada en Twilio.", examples=["CA0123456789abcdef"])
    estado: str = Field(examples=["queued"])


TWILIO_MAX_S = 24 * 3600  # Twilio no acepta llamadas de más de 24 h


def duracion_maxima_s() -> int:
    """Tope de la llamada en segundos, desde LLAMADA_MAX_MIN (por defecto 240 = 4 h, el de Twilio).

    Ojo: en la cuenta trial Twilio corta igual a los 10 minutos; el valor solo rige con cuenta pagada.
    """
    try:
        minutos = int(os.getenv("LLAMADA_MAX_MIN", "240"))
    except ValueError:
        minutos = 240
    return max(60, min(minutos * 60, TWILIO_MAX_S))


def llamar_con_twilio(numero: str, base: str) -> tuple[str, str]:
    """Twilio llama al ejecutivo; al contestar pide las instrucciones a /twilio/voz (plan C)."""
    from twilio.rest import Client

    llamada = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"]).calls.create(
        to=numero,
        from_=os.environ["TWILIO_PHONE_NUMBER"],
        url=f"{base}/twilio/voz",
        status_callback=f"{base}/twilio/estado",
        time_limit=duracion_maxima_s(),
    )
    return llamada.sid, llamada.status


@app.post(
    "/llamadas", tags=["llamada"], summary="Llamar al ejecutivo por teléfono (v1)",
    response_model=LlamadaResponse, responses=errores(403, 422, 503),
)
async def crear_llamada(req: LlamadaRequest) -> LlamadaResponse:
    """v1 (plan C): Twilio llama al ejecutivo y la conversación sigue por /twilio/* y el WebSocket /twilio/cliente.

    TODO(auth): exigir el token del cliente y limitar la tasa antes de desplegar (A4).
    """
    # Demo: los contactos de la app no tienen teléfono; todos llaman al teléfono de la demo (NUMERO_DEMO).
    # TODO(real-data): cada contacto con su número real.
    numero = (req.numero or os.getenv("NUMERO_DEMO", "")).strip()
    if not E164.fullmatch(numero):
        raise HTTPException(422, "El número debe estar en formato E.164 (+56...)")
    # Anti fraude telefónico: solo se puede llamar a números de una lista explícita (los de la demo).
    permitidos = {n.strip() for n in os.getenv("ALLOWED_DESTINATIONS", "").split(",") if n.strip()}
    if numero not in permitidos:
        raise HTTPException(403, "Número no permitido (ALLOWED_DESTINATIONS)")
    base = os.getenv("PUBLIC_BASE_URL", "").split("#")[0].strip().rstrip("/")
    faltan = [k for k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER") if not os.getenv(k)]
    if faltan or not base.startswith("https://"):
        raise HTTPException(503, "Twilio no configurado (TWILIO_* y PUBLIC_BASE_URL con https://)")
    sid, estado = await asyncio.to_thread(llamar_con_twilio, numero, base)
    sala.llamadas_creadas.add(sid)
    return LlamadaResponse(sid=sid, estado=estado)
