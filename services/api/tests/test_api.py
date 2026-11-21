import base64
import json

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def claims(jwt: str) -> dict:
    payload = jwt.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))


def configure_livekit(monkeypatch):
    monkeypatch.setenv("LIVEKIT_URL", "wss://example.livekit.cloud")
    monkeypatch.setenv("LIVEKIT_API_KEY", "devkey")
    monkeypatch.setenv("LIVEKIT_API_SECRET", "devsecret-devsecret-devsecret-devsecret")


def test_health():
    assert client.get("/health").json() == {"ok": True}


def test_glosses_serves_dictionary():
    data = client.get("/glosses").json()
    assert data["version"] >= 1
    assert any(g["gloss"] == "HOLA" for g in data["glosses"])


def test_token_without_livekit_config_returns_503(monkeypatch):
    for k in ("LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"):
        monkeypatch.delenv(k, raising=False)
    assert client.post("/token").status_code == 503


def test_token_is_server_controlled_and_least_privilege(monkeypatch):
    configure_livekit(monkeypatch)
    # El cliente intenta imponer identidad, sala y rol: todo debe ignorarse.
    r = client.post("/token", json={"identity": "agent", "room": "sala-ajena", "role": "ejecutivo"})
    assert r.status_code == 200
    body = r.json()
    assert body["identity"].startswith("cliente-") and body["identity"] != "agent"
    assert body["room"].startswith("puente-") and body["room"] != "sala-ajena"

    c = claims(body["token"])
    assert c["sub"] == body["identity"]
    assert c["attributes"] == {"role": "cliente"}
    assert c["video"]["room"] == body["room"]
    assert c["video"]["canPublish"] is False
    assert c["video"]["canPublishData"] is True


def test_tokens_use_distinct_unguessable_rooms(monkeypatch):
    configure_livekit(monkeypatch)
    a, b = (client.post("/token").json() for _ in range(2))
    assert a["room"] != b["room"] and a["identity"] != b["identity"]


def test_llamada_requires_e164():
    r = client.post("/llamadas", json={"room": "x", "numero": "912345678"})
    assert r.status_code == 422


def test_llamada_blocks_numbers_outside_allowlist(monkeypatch):
    monkeypatch.setenv("ALLOWED_DESTINATIONS", "+56911111111")
    r = client.post("/llamadas", json={"room": "x", "numero": "+56922222222"})
    assert r.status_code == 403
    r = client.post("/llamadas", json={"room": "x", "numero": "+56911111111"})
    assert r.status_code == 501  # permitido, pero la llamada SIP sigue como TODO(v1)


def test_twilio_voz_points_stream_to_public_wss(monkeypatch):
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://abc.ngrok-free.app")
    r = client.post("/twilio/voz")
    assert r.status_code == 200
    assert '<Stream url="wss://abc.ngrok-free.app/twilio/media"/>' in r.text


def test_twilio_media_echoes_audio():
    with client.websocket_connect("/twilio/media") as ws:
        ws.send_json({"event": "start", "start": {"streamSid": "MZ1"}})
        ws.send_json({"event": "media", "media": {"payload": "AAEC"}})
        assert ws.receive_json() == {"event": "media", "streamSid": "MZ1", "media": {"payload": "AAEC"}}
        ws.send_json({"event": "stop"})


def test_twilio_gather_uses_absolute_urls(monkeypatch):
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://abc.ngrok-free.app")
    r = client.post("/twilio/voz?modo=gather")
    assert 'action="https://abc.ngrok-free.app/twilio/turno"' in r.text
    assert '<Gather input="speech"' in r.text


def test_twilio_turno_receives_transcript(monkeypatch):
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://abc.ngrok-free.app")
    r = client.post("/twilio/turno", data={"SpeechResult": "quiero una hora <x>", "Confidence": "0.9"})
    assert r.status_code == 200
    assert "Entendí: quiero una hora &lt;x&gt;" in r.text  # escapado: el texto del teléfono no puede inyectar TwiML
