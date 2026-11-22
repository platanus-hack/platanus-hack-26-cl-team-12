"""Casos borde de la API: CORS, TTL del token, validación de /llamadas y fuente del diccionario."""

import base64
import json
import os

import pytest
from fastapi.testclient import TestClient

from app import main
from app.main import app

client = TestClient(app)


def claims(jwt: str) -> dict:
    payload = jwt.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))


@pytest.fixture
def livekit(monkeypatch):
    monkeypatch.setenv("LIVEKIT_URL", "wss://example.livekit.cloud")
    monkeypatch.setenv("LIVEKIT_API_KEY", "devkey")
    monkeypatch.setenv("LIVEKIT_API_SECRET", "devsecret-devsecret-devsecret-devsecret")


@pytest.mark.parametrize("missing", ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"])
def test_token_503_if_any_livekit_var_missing(livekit, monkeypatch, missing):
    monkeypatch.delenv(missing)
    assert client.post("/token").status_code == 503


def test_token_expires_in_one_hour_and_is_signed_for_key(livekit):
    body = client.post("/token").json()
    c = claims(body["token"])
    # livekit llama a now() dos veces (nbf y exp): puede cruzar un segundo entre ambas.
    assert 3600 <= c["exp"] - c["nbf"] <= 3601
    assert c["iss"] == "devkey"
    assert c["video"]["roomJoin"] is True
    assert c["video"]["canSubscribe"] is True
    assert body["url"] == "wss://example.livekit.cloud"


def test_token_rejects_get():
    assert client.get("/token").status_code == 405


# main.py hace load_dotenv() y fija CORS al importarse: los tests usan los orígenes efectivos.
CORS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]


def test_cors_allows_configured_origin():
    origin = next((o for o in CORS if o != "*"), "http://localhost:3000")
    r = client.options("/token", headers={"Origin": origin, "Access-Control-Request-Method": "POST"})
    assert r.headers.get("access-control-allow-origin") in (origin, "*" if "*" in CORS else origin)


@pytest.mark.skipif("*" in CORS, reason="CORS_ORIGINS=* en el entorno local permite cualquier origen")
def test_cors_rejects_unknown_origin():
    r = client.options(
        "/token",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in r.headers


@pytest.mark.parametrize("numero", ["+0123456789", "56912345678", "+56 9 1234 5678", "+561", "+5691234567890123"])
def test_llamada_rejects_non_e164(numero):
    assert client.post("/llamadas", json={"room": "x", "numero": numero}).status_code == 422


def test_llamada_with_empty_allowlist_blocks_everything(monkeypatch):
    monkeypatch.delenv("ALLOWED_DESTINATIONS", raising=False)
    assert client.post("/llamadas", json={"room": "x", "numero": "+56911111111"}).status_code == 403


def test_llamada_allowlist_trims_spaces(monkeypatch):
    monkeypatch.setenv("ALLOWED_DESTINATIONS", " +56911111111 , ,+56922222222")
    monkeypatch.delenv("TWILIO_ACCOUNT_SID", raising=False)
    # Pasa la lista permitida (con espacios) y llega a la configuración de Twilio, que falta: 503.
    assert client.post("/llamadas", json={"room": "x", "numero": "+56922222222"}).status_code == 503


def test_llamada_requires_body_fields():
    # `room` es opcional desde el plan C (Twilio sin LiveKit); `numero` sigue siendo obligatorio.
    assert client.post("/llamadas", json={"room": "x"}).status_code == 422
    assert client.post("/llamadas", json={}).status_code == 422


def test_glosses_reads_configured_path(tmp_path, monkeypatch):
    p = tmp_path / "g.json"
    p.write_text(json.dumps({"version": 9, "glosses": []}), encoding="utf-8")
    monkeypatch.setattr(main, "GLOSSES_PATH", p)
    assert client.get("/glosses").json() == {"version": 9, "glosses": []}


def test_shared_glosses_file_exists_at_repo_root():
    # Se valida la ruta por defecto, no main.GLOSSES_PATH (un .env local puede sobreescribirla).
    assert main.DEFAULT_PATH.exists()
