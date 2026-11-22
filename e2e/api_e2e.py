"""API real de Puente para los tests e2e, sin llamar de verdad a Twilio ni a Claude.

Es `services/api/app/main.py` tal cual, con dos cambios:
  - `llamar_con_twilio` no llama: guarda la llamada en memoria (GET /e2e/llamadas la muestra).
  - El traductor de la sala es determinista ("Simple: …", "Formal: …"), así los tests saben qué esperar.
El test hace de Twilio: postea a /twilio/voz, /twilio/turno, /twilio/espera y /twilio/estado con una firma
X-Twilio-Signature válida (calculada con E2E_TWILIO_AUTH_TOKEN), igual que Twilio en producción.

Lo levanta playwright.config.ts:
  uv --directory services/api run uvicorn --app-dir ../../e2e api_e2e:app --port 8765
"""

import os
import sys
from pathlib import Path

# Entorno fijo ANTES de importar la API: load_dotenv() no pisa lo que ya está definido, así el .env local
# (con claves reales) no se cuela en los tests.
E2E_ENV = {
    "API_ENV": "development",
    "TWILIO_ACCOUNT_SID": "ACe2e",
    "TWILIO_AUTH_TOKEN": os.getenv("E2E_TWILIO_AUTH_TOKEN", "token-e2e"),
    "TWILIO_PHONE_NUMBER": "+15550000000",
    "PUBLIC_BASE_URL": "https://e2e.puente.test",
    "NUMERO_DEMO": "+56900000000",
    "ALLOWED_DESTINATIONS": "+56900000000",
    "CLIENTE_WS_TOKEN": "",
    "CORS_ORIGINS": os.getenv("E2E_WEB_ORIGIN", "http://127.0.0.1:3100"),
    "ANTHROPIC_API_KEY": "",
    # Sin ElevenLabs: el ejecutivo oye <Say> (voz de Twilio) con el texto, que el test puede leer, y no se gasta saldo.
    "ELEVENLABS_API_KEY": "",
}
os.environ.update(E2E_ENV)

API_DIR = Path(__file__).resolve().parents[1] / "services" / "api"
sys.path.insert(0, str(API_DIR))

from fastapi import APIRouter, HTTPException  # noqa: E402

import app.main as main  # noqa: E402
from app.llamada import sala  # noqa: E402
from app.traductor import GlossResult, SimpleResult  # noqa: E402


class TraductorFalso:
    """Mismo contrato que app.traductor.Traductor, sin red."""

    async def simplificar(self, texto: str) -> SimpleResult:
        return SimpleResult(simple=f"Simple: {texto}", opciones=["Sí, gracias", "Repita, por favor"])

    async def a_glosas(self, texto: str) -> GlossResult:
        return GlossResult(glosas=["HOLA", "GRACIAS"], subtitulo=f"Simple: {texto}")

    async def complejizar(self, texto: str) -> str:
        return f"Formal: {texto}"

    def para_voz(self, frase: str) -> str:
        return frase


sala.traductor = TraductorFalso()

llamadas: list[dict] = []
falla: dict[str, str | None] = {"detalle": None}


def llamar_falso(numero: str, base: str) -> tuple[str, str]:
    if falla["detalle"]:
        raise HTTPException(503, falla["detalle"])
    llamadas.append({"numero": numero, "base": base})
    return f"CAe2e{len(llamadas)}", "queued"


main.llamar_con_twilio = llamar_falso

control = APIRouter(prefix="/e2e", tags=["e2e"])


@control.get("/llamadas")
def ver_llamadas() -> list[dict]:
    return llamadas


@control.post("/reiniciar")
def reiniciar() -> dict:
    llamadas.clear()
    falla["detalle"] = None
    sala.reiniciar()
    return {"ok": True}


@control.post("/fallar")
def fallar(detalle: str = "Twilio no configurado") -> dict:
    """La próxima llamada a Twilio falla (para probar el aviso de error en la app)."""
    falla["detalle"] = detalle
    return {"ok": True}


@control.get("/clientes")
def clientes() -> dict:
    """Cuántas apps tienen abierto el WebSocket /twilio/cliente (para esperar a que la app se conecte)."""
    return {"conectados": len(sala.clientes)}


main.app.include_router(control)
app = main.app
