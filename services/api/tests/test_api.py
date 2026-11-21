import base64
import json

import pytest

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



class FakeTraductor:
    async def simplificar(self, texto):
        return f"simple({texto})"

    async def complejizar(self, texto):
        return f"formal({texto})"


@pytest.fixture
def sala_falsa(monkeypatch):
    from app.llamada import sala

    monkeypatch.setenv("PUBLIC_BASE_URL", "https://abc.ngrok-free.app")
    monkeypatch.setattr(sala, "traductor", FakeTraductor())
    sala.reiniciar()
    return sala


def test_twilio_voz_saluda_y_escucha_con_urls_absolutas(sala_falsa):
    r = client.post("/twilio/voz")
    assert '<Gather input="speech"' in r.text and "Puente" in r.text
    assert 'action="https://abc.ngrok-free.app/twilio/turno"' in r.text


def test_twilio_stream_mode_points_to_public_wss(sala_falsa):
    r = client.post("/twilio/voz?modo=stream")
    assert '<Stream url="wss://abc.ngrok-free.app/twilio/media"/>' in r.text


def test_conversacion_completa_por_turnos(sala_falsa):
    with client.websocket_connect("/twilio/cliente") as pwa:
        client.post("/twilio/voz")
        assert pwa.receive_json() == {"tipo": "estado", "valor": "llamada_iniciada"}

        # Turno del ejecutivo: el texto (escapado) va simplificado a la PWA y Twilio queda esperando.
        r = client.post("/twilio/turno", data={"SpeechResult": "su hora es el martes <x>"})
        assert "/twilio/espera?n=0" in r.text
        assert pwa.receive_json() == {
            "tipo": "ejecutivo_dice", "texto": "su hora es el martes <x>", "simple": "simple(su hora es el martes <x>)"
        }
        assert "<Pause" in client.post("/twilio/espera?n=0").text  # el cliente todavía no responde

        # Turno del cliente: se complejiza y se le dice al ejecutivo (escapado), y se vuelve a escuchar.
        pwa.send_json({"tipo": "cliente_dice", "texto": "martes bueno"})
        pwa.send_json({"tipo": "ping"})  # mensaje desconocido: se ignora
        for _ in range(50):
            r = client.post("/twilio/espera?n=1")
            if "formal(" in r.text:
                break
        assert "formal(martes bueno)" in r.text and '<Gather input="speech"' in r.text


def test_twilio_turno_vacio_vuelve_a_escuchar(sala_falsa):
    r = client.post("/twilio/turno", data={"SpeechResult": ""})
    assert '<Gather input="speech"' in r.text


def test_twilio_media_echoes_audio():
    with client.websocket_connect("/twilio/media") as ws:
        ws.send_json({"event": "start", "start": {"streamSid": "MZ1"}})
        ws.send_json({"event": "media", "media": {"payload": "AAEC"}})
        assert ws.receive_json() == {"event": "media", "streamSid": "MZ1", "media": {"payload": "AAEC"}}
        ws.send_json({"event": "stop"})


def test_glosses_respeta_el_modelo_publicado():
    data = client.get("/glosses").json()
    assert all({"gloss", "category", "es", "classifierLabel"} <= g.keys() for g in data["glosses"])


def _app_con_env(monkeypatch, **env):
    import importlib

    import app.main as main

    for k in ("API_ENV", "API_DOCS"):
        monkeypatch.delenv(k, raising=False)
    for k, v in env.items():
        monkeypatch.setenv(k, v)
    return TestClient(importlib.reload(main).app)


def test_swagger_en_desarrollo(monkeypatch):
    c = _app_con_env(monkeypatch)
    assert c.get("/docs").status_code == 200
    spec = c.get("/openapi.json").json()
    assert {"/health", "/token", "/llamadas", "/glosses"} <= spec["paths"].keys()
    assert {t["name"] for t in spec["tags"]} == {"sistema", "llamada", "glosas"}
    assert "503" in spec["paths"]["/token"]["post"]["responses"]


def test_swagger_apagado_en_produccion(monkeypatch):
    c = _app_con_env(monkeypatch, API_ENV="production")
    for ruta in ("/docs", "/redoc", "/openapi.json"):
        assert c.get(ruta).status_code == 404
    assert c.get("/health").status_code == 200
    assert _app_con_env(monkeypatch, API_ENV="production", API_DOCS="1").get("/docs").status_code == 200
    assert _app_con_env(monkeypatch, API_DOCS="0").get("/docs").status_code == 404
    # `API_DOCS=` vacío (como viene en .env.example) no apaga Swagger en desarrollo
    assert _app_con_env(monkeypatch, API_DOCS="").get("/docs").status_code == 200


def test_logs_no_guardan_lo_que_se_dice(sala_falsa, caplog):
    """seguridad-datos-cl: la conversación puede traer RUT o datos de salud; no va a los logs."""
    caplog.set_level("DEBUG")
    client.post("/twilio/turno", data={"SpeechResult": "mi RUT es 11.111.111-1", "Confidence": "0.9"})
    assert "11.111.111-1" not in caplog.text
