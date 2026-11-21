"""API de Puente (ADR-0005, ADR-0009, ADR-0011).

- /health          chequeo de vida (heredado del backend original).
- /token           token de LiveKit con permisos mínimos por rol.
- /llamadas        crea la llamada telefónica saliente (LiveKit SIP + Twilio) — v1.
- /glosses         diccionario de glosas (contrato de ADR-0001).
- /twilio/*        v1 sin LiveKit: Twilio conversa por turnos con el ejecutivo (app/twilio_media.py, app/llamada.py).
"""

import json
import os
import re
import uuid
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.llamada import router as llamada_router
from app.twilio_media import router as twilio_router

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parents[3]
GLOSSES_PATH = Path(os.getenv("GLOSSES_PATH", REPO_ROOT / "packages/glosses/data/glosses.json"))

ROL_CLIENTE = "cliente"
E164 = re.compile(r"\+[1-9]\d{7,14}")

app = FastAPI(title="Puente - llamadas accesibles")
app.add_middleware(
    CORSMiddleware,
    # En producción: CORS_ORIGINS=https://<tu-pwa>.vercel.app (lista separada por comas).
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(twilio_router)
app.include_router(llamada_router)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/glosses")
def glosses():
    return json.loads(GLOSSES_PATH.read_text(encoding="utf-8"))


class TokenResponse(BaseModel):
    url: str
    token: str
    room: str
    identity: str


@app.post("/token", response_model=TokenResponse)
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
    room: str
    numero: str  # formato E.164, ej. +56912345678


@app.post("/llamadas")
def crear_llamada(req: LlamadaRequest):
    """v1: llama al ejecutivo por teléfono y lo une a la sala como participante SIP.

    TODO(v1): crear un SIP outbound trunk en LiveKit apuntando al Elastic SIP Trunk de Twilio
    (LIVEKIT_SIP_TRUNK_ID) y llamar a `CreateSIPParticipant` con `sip_call_to=req.numero`.
    Ver services/agent/telefonia/README.md.
    """
    if not E164.fullmatch(req.numero):
        raise HTTPException(422, "El número debe estar en formato E.164 (+56...)")
    # Anti fraude telefónico: solo se puede llamar a números de una lista explícita (los de la demo).
    permitidos = {n.strip() for n in os.getenv("ALLOWED_DESTINATIONS", "").split(",") if n.strip()}
    if req.numero not in permitidos:
        raise HTTPException(403, "Número no permitido (ALLOWED_DESTINATIONS)")
    # TODO(v1): verificar que `req.room` pertenece al token del cliente que llama (firmar el room en /token).
    raise HTTPException(501, "TODO(v1): llamada SIP saliente aún no implementada")
