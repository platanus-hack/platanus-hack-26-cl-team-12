"""API de Puente (ADR-0005, ADR-0009, ADR-0011).

- /health          chequeo de vida (heredado del backend original).
- /token           token de LiveKit con permisos mínimos por rol.
- /llamadas        crea la llamada telefónica saliente (LiveKit SIP + Twilio) — v1.
- /glosses         diccionario de glosas (contrato de ADR-0001).
"""

import json
import os
from datetime import timedelta
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parents[3]
GLOSSES_PATH = Path(os.getenv("GLOSSES_PATH", REPO_ROOT / "packages/glosses/data/glosses.json"))

app = FastAPI(title="Puente - llamadas accesibles")
app.add_middleware(
    CORSMiddleware,
    # TODO: restringir a la URL de la PWA en producción.
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/glosses")
def glosses():
    return json.loads(GLOSSES_PATH.read_text(encoding="utf-8"))


class TokenRequest(BaseModel):
    identity: str
    role: Literal["cliente", "ejecutivo"]
    room: str | None = None


class TokenResponse(BaseModel):
    url: str
    token: str
    room: str


@app.post("/token", response_model=TokenResponse)
def token(req: TokenRequest) -> TokenResponse:
    from livekit import api as lk

    url, key, secret = (os.getenv(k) for k in ("LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"))
    if not (url and key and secret):
        raise HTTPException(503, "LiveKit no configurado (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)")

    room = req.room or f"puente-{req.identity}"
    grants = lk.VideoGrants(room_join=True, room=room, can_publish=True, can_subscribe=True, can_publish_data=True)
    jwt = (
        lk.AccessToken(key, secret)
        .with_identity(req.identity)
        .with_attributes({"role": req.role})
        .with_grants(grants)
        .with_ttl(timedelta(hours=1))
        .to_jwt()
    )
    return TokenResponse(url=url, token=jwt, room=room)


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
    if not req.numero.startswith("+"):
        raise HTTPException(422, "El número debe estar en formato E.164 (+56...)")
    raise HTTPException(501, "TODO(v1): llamada SIP saliente aún no implementada")
