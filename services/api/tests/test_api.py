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
    monkeypatch.delenv("TWILIO_ACCOUNT_SID", raising=False)
    r = client.post("/llamadas", json={"room": "x", "numero": "+56911111111"})
    assert r.status_code == 503  # permitido, pero Twilio no está configurado


def test_llamada_crea_la_llamada_en_twilio(monkeypatch):
    import app.main as m

    monkeypatch.setenv("ALLOWED_DESTINATIONS", "+56911111111")
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://abc.ngrok-free.app")
    for k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"):
        monkeypatch.setenv(k, "x")
    llamadas = []
    monkeypatch.setattr(m, "llamar_con_twilio", lambda numero, base: llamadas.append((numero, base)) or ("CA1", "queued"))
    r = client.post("/llamadas", json={"numero": "+56911111111"})  # sin room: el plan C no la usa
    assert r.status_code == 200 and r.json() == {"sid": "CA1", "estado": "queued"}
    assert llamadas == [("+56911111111", "https://abc.ngrok-free.app")]



class FakeTraductor:
    async def simplificar(self, texto):
        from app.traductor import SimpleResult

        return SimpleResult(simple=f"simple({texto})", opciones=["Sí", "No"])

    async def complejizar(self, texto):
        return f"formal({texto})"

    async def glosas_a_espanol(self, glosas):
        return f"formal({' '.join(glosas)})"

    def glosas_conocidas(self, glosas):
        return [g for g in glosas if isinstance(g, str) and g != "INVENTADA"]

    async def a_glosas(self, texto):
        from app.traductor import GlossResult

        return GlossResult(glosas=["MARTES", "HORA"], subtitulo=f"señas({texto})")

    def para_voz(self, frase):
        return frase


@pytest.fixture
def sala_falsa(monkeypatch):
    from app.llamada import sala

    monkeypatch.setenv("PUBLIC_BASE_URL", "https://abc.ngrok-free.app")
    # main.py carga el .env local: sin esto, un TWILIO_AUTH_TOKEN real haría fallar los POST sin firma.
    monkeypatch.delenv("TWILIO_AUTH_TOKEN", raising=False)
    monkeypatch.delenv("CLIENTE_WS_TOKEN", raising=False)
    monkeypatch.setenv("API_ENV", "development")
    monkeypatch.setattr(sala, "traductor", FakeTraductor())
    sala.reiniciar()
    return sala


def test_twilio_voz_saluda_y_espera_que_parta_el_cliente(sala_falsa):
    r = client.post("/twilio/voz")
    # Parte la persona sorda: no se escucha al ejecutivo hasta que el cliente haya dicho algo.
    assert '<Gather' not in r.text and "Brich" in r.text
    assert "https://abc.ngrok-free.app/twilio/espera?n=0" in r.text


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
        # Texto simple (v2) y señas (v4) llegan los dos; el orden no importa (van en paralelo).
        recibidos = {m["tipo"]: m for m in (pwa.receive_json(), pwa.receive_json())}
        assert recibidos["ejecutivo_dice"] == {
            "tipo": "ejecutivo_dice",
            "texto": "su hora es el martes <x>",
            "simple": "simple(su hora es el martes <x>)",
            "opciones": ["Sí", "No"],
        }
        assert recibidos["glosas_para_senar"] == {
            "tipo": "glosas_para_senar", "glosas": ["MARTES", "HORA"], "subtitulo": "señas(su hora es el martes <x>)"
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


def test_ejecutivo_dice_sin_traduccion_si_claude_falla(sala_falsa, monkeypatch):
    class Roto(FakeTraductor):
        async def simplificar(self, texto):
            raise RuntimeError("sin red")

    monkeypatch.setattr(sala_falsa, "traductor", Roto())
    with client.websocket_connect("/twilio/cliente") as pwa:
        client.post("/twilio/turno", data={"SpeechResult": "hola"})
        assert pwa.receive_json() == {"tipo": "ejecutivo_dice", "texto": "hola", "simple": None, "opciones": []}


def test_ejecutivo_dice_respeta_el_tope_del_contrato(sala_falsa):
    from app.traductor import MAX_TEXTO

    with client.websocket_connect("/twilio/cliente") as pwa:
        client.post("/twilio/turno", data={"SpeechResult": "a" * (MAX_TEXTO + 100)})
        msg = pwa.receive_json()
    assert len(msg["texto"]) == MAX_TEXTO and msg["texto"].endswith("…")
    assert len(msg["simple"]) <= MAX_TEXTO


# ── Auth mínima (A4) ──────────────────────────────────────────────────────────


def _firmar(url: str, params: dict, token: str) -> str:
    from twilio.request_validator import RequestValidator

    return RequestValidator(token).compute_signature(url, params)


def test_twilio_post_sin_firma_es_rechazado(sala_falsa, monkeypatch):
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "secreto-twilio")
    assert client.post("/twilio/turno", data={"SpeechResult": "hola"}).status_code == 403
    r = client.post("/twilio/voz", headers={"X-Twilio-Signature": "falsa"})
    assert r.status_code == 403


def test_twilio_post_con_firma_valida_pasa(sala_falsa, monkeypatch):
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "secreto-twilio")
    # Twilio firma la URL pública (PUBLIC_BASE_URL), con query, y los parámetros del form.
    params = {"SpeechResult": ""}
    url = "https://abc.ngrok-free.app/twilio/turno?x=1"
    r = client.post("/twilio/turno?x=1", data=params, headers={"X-Twilio-Signature": _firmar(url, params, "secreto-twilio")})
    assert r.status_code == 200 and '<Gather input="speech"' in r.text


def test_firma_de_otra_url_no_sirve(sala_falsa, monkeypatch):
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "secreto-twilio")
    firma = _firmar("https://abc.ngrok-free.app/twilio/voz", {}, "secreto-twilio")
    assert client.post("/twilio/escuchar", headers={"X-Twilio-Signature": firma}).status_code == 403


def test_ws_cliente_exige_token(sala_falsa, monkeypatch):
    from starlette.websockets import WebSocketDisconnect

    monkeypatch.setenv("CLIENTE_WS_TOKEN", "abc123")
    for ruta in ("/twilio/cliente", "/twilio/cliente?token=otro"):
        with pytest.raises(WebSocketDisconnect) as e:
            with client.websocket_connect(ruta):
                pass
        assert e.value.code == 1008
    with client.websocket_connect("/twilio/cliente?token=abc123") as pwa:
        client.post("/twilio/voz")
        assert pwa.receive_json() == {"tipo": "estado", "valor": "llamada_iniciada"}


def test_en_produccion_sin_secretos_falla_cerrado(sala_falsa, monkeypatch):
    from starlette.websockets import WebSocketDisconnect

    monkeypatch.setenv("API_ENV", "production")
    assert client.post("/twilio/voz").status_code == 503
    with pytest.raises(WebSocketDisconnect) as e:
        with client.websocket_connect("/twilio/cliente"):
            pass
    assert e.value.code == 1008


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


def _decir_pendiente():
    """Twilio vuelve a preguntar si hay respuesta: ahí empieza a sonar y la app recibe `cliente_dijo`."""
    for _ in range(50):
        r = client.post("/twilio/espera?n=1")
        if "<Say" in r.text:
            return r.text
    return r.text


def test_glosas_cliente_se_convierten_en_frase_se_dicen_y_se_muestran_al_sonar(sala_falsa):
    """v3: lo que firma el cliente (glosas) se convierte y se dice por voz; la app recibe la frase recién cuando suena."""
    with client.websocket_connect("/twilio/cliente") as pwa:
        client.post("/twilio/voz")
        assert pwa.receive_json() == {"tipo": "estado", "valor": "llamada_iniciada"}
        pwa.send_json({"tipo": "glosas_cliente", "glosas": ["HOLA", "INVENTADA", "AMBULANCIA"], "confianza": 1})
        assert "formal(HOLA AMBULANCIA)" in _decir_pendiente()
        assert pwa.receive_json() == {"tipo": "cliente_dijo", "texto": "formal(HOLA AMBULANCIA)"}


def test_cliente_dice_tambien_muestra_la_frase_convertida_al_sonar(sala_falsa):
    with client.websocket_connect("/twilio/cliente") as pwa:
        client.post("/twilio/voz")
        pwa.receive_json()
        pwa.send_json({"tipo": "cliente_dice", "texto": "martes bueno"})
        assert "formal(martes bueno)" in _decir_pendiente()
        assert pwa.receive_json() == {"tipo": "cliente_dijo", "texto": "formal(martes bueno)"}


def test_cliente_dijo_no_se_manda_antes_de_que_suene(sala_falsa):
    with client.websocket_connect("/twilio/cliente") as pwa:
        client.post("/twilio/voz")
        pwa.receive_json()
        pwa.send_json({"tipo": "cliente_dice", "texto": "martes bueno"})
        pwa.send_json({"tipo": "ping"})
        assert sala_falsa.respuestas.qsize() in (0, 1)  # aún en cola (o recién convertida): la app no recibe nada todavía
        _decir_pendiente()
        assert pwa.receive_json()["tipo"] == "cliente_dijo"


def test_glosas_cliente_sin_glosas_validas_no_hace_nada(sala_falsa):
    with client.websocket_connect("/twilio/cliente") as pwa:
        client.post("/twilio/voz")
        pwa.receive_json()
        pwa.send_json({"tipo": "glosas_cliente", "glosas": ["INVENTADA"], "confianza": 1})
        pwa.send_json({"tipo": "glosas_cliente", "glosas": "no-es-lista", "confianza": 1})
        pwa.send_json({"tipo": "cliente_dice", "texto": "hola"})
        assert "formal(hola)" in _decir_pendiente()  # lo único que se dice es lo válido
        assert pwa.receive_json() == {"tipo": "cliente_dijo", "texto": "formal(hola)"}


def test_glosas_cliente_si_claude_falla_se_dicen_tal_cual(sala_falsa, monkeypatch):
    async def falla(glosas):
        raise RuntimeError("sin Claude")

    monkeypatch.setattr(sala_falsa.traductor, "glosas_a_espanol", falla)
    with client.websocket_connect("/twilio/cliente") as pwa:
        client.post("/twilio/voz")
        pwa.receive_json()
        pwa.send_json({"tipo": "glosas_cliente", "glosas": ["HOLA", "AMBULANCIA"], "confianza": 1})
        assert "hola ambulancia" in _decir_pendiente()
        assert pwa.receive_json() == {"tipo": "cliente_dijo", "texto": "hola ambulancia"}


def test_llamada_sin_numero_usa_el_telefono_de_la_demo(monkeypatch):
    import app.main as m

    monkeypatch.setenv("NUMERO_DEMO", "+56911111111")
    monkeypatch.setenv("ALLOWED_DESTINATIONS", "+56911111111")
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://abc.ngrok-free.app")
    for k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"):
        monkeypatch.setenv(k, "x")
    llamadas = []
    monkeypatch.setattr(m, "llamar_con_twilio", lambda numero, base: llamadas.append(numero) or ("CA1", "queued"))
    assert client.post("/llamadas", json={"destino": "clinica"}).status_code == 200
    assert llamadas == ["+56911111111"]



def test_si_fallan_las_senas_igual_llega_el_texto(sala_falsa):
    async def falla(_texto):
        raise RuntimeError("Claude caído")

    sala_falsa.traductor.a_glosas = falla
    with client.websocket_connect("/twilio/cliente") as pwa:
        client.post("/twilio/turno", data={"SpeechResult": "hola"})
        assert pwa.receive_json()["tipo"] == "ejecutivo_dice"


@pytest.fixture
def voz_falsa(monkeypatch, sala_falsa):
    """ElevenLabs falso: devuelve un 'mp3' con el texto, sin red ni costo."""
    from app.voz import voz

    async def generar(texto):
        return b"MP3:" + texto.encode()

    monkeypatch.setattr(voz, "activa", lambda: True)
    monkeypatch.setattr(voz, "_generar", generar)
    voz._fijas.clear(), voz._id_fija.clear(), voz.olvidar_respuestas()
    return voz


def test_voz_chilena_en_el_saludo_y_twilio_baja_el_audio(voz_falsa):
    import re

    r = client.post("/twilio/voz")
    assert "<Say" not in r.text
    url = re.search(r"<Play>(https://abc\.ngrok-free\.app/twilio/audio/[\w-]+\.mp3)</Play>", r.text)
    assert url, r.text
    audio = client.get(url.group(1).replace("https://abc.ngrok-free.app", ""))
    assert audio.status_code == 200 and audio.headers["content-type"] == "audio/mpeg"
    assert audio.content.startswith(b"MP3:Hola. Le habla Brich")


def test_respuesta_del_cliente_con_voz_chilena_y_se_borra_en_otra_llamada(voz_falsa):
    import re

    with client.websocket_connect("/twilio/cliente") as pwa:
        pwa.send_json({"tipo": "cliente_dice", "texto": "martes bueno"})
        pwa.send_json({"tipo": "ping"})
        for _ in range(50):
            r = client.post("/twilio/espera?n=1")
            if "<Play>" in r.text and "audio" in r.text:
                break
    ruta = re.search(r"/twilio/audio/[\w-]+\.mp3", r.text.split("<Gather")[0]).group(0)
    assert client.get(ruta).content == b"MP3:formal(martes bueno)"
    client.post("/twilio/voz")  # empieza otra llamada: el audio con datos de la anterior ya no existe
    assert client.get(ruta).status_code == 404


def test_si_elevenlabs_falla_se_usa_la_voz_de_twilio(voz_falsa, monkeypatch):
    async def falla(_texto):
        return None

    monkeypatch.setattr(voz_falsa, "_generar", falla)
    r = client.post("/twilio/voz")
    assert '<Say language="es-MX">Hola. Le habla Brich' in r.text and "<Play>" not in r.text


def test_audio_inexistente_da_404():
    assert client.get("/twilio/audio/no-existe.mp3").status_code == 404


def test_trial_primer_pedido_sin_firma_solo_para_llamadas_propias(sala_falsa, monkeypatch):
    """El trial de Twilio manda /voz por TwilioProxy sin X-Twilio-Signature: se acepta solo con un CallSid nuestro."""
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "token-de-prueba")
    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "AC_nuestra")
    sala_falsa.llamadas_creadas.add("CA_nuestra")
    try:
        propia = {"CallSid": "CA_nuestra", "AccountSid": "AC_nuestra"}
        assert client.post("/twilio/voz", data=propia).status_code == 200
        assert client.post("/twilio/voz", data={**propia, "CallSid": "CA_ajena"}).status_code == 403
        assert client.post("/twilio/voz", data={**propia, "AccountSid": "AC_otra"}).status_code == 403
        # Con firma presente (aunque sea de una llamada propia), se valida la firma como siempre.
        assert client.post("/twilio/voz", data=propia, headers={"X-Twilio-Signature": "falsa"}).status_code == 403
    finally:
        sala_falsa.llamadas_creadas.discard("CA_nuestra")


def test_llamadas_registra_el_callsid(monkeypatch):
    import app.main as m
    from app.llamada import sala

    monkeypatch.setenv("ALLOWED_DESTINATIONS", "+56911111111")
    monkeypatch.setenv("PUBLIC_BASE_URL", "https://abc.ngrok-free.app")
    for k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"):
        monkeypatch.setenv(k, "x")
    monkeypatch.setattr(m, "llamar_con_twilio", lambda numero, base: ("CA_registrada", "queued"))
    client.post("/llamadas", json={"numero": "+56911111111"})
    assert "CA_registrada" in sala.llamadas_creadas
    sala.llamadas_creadas.discard("CA_registrada")



def test_espera_larga_responde_apenas_llega_la_respuesta(sala_falsa, monkeypatch):
    """El servidor retiene /twilio/espera hasta que el cliente responde: menos pedidos a Twilio por llamada."""
    import threading
    import time

    monkeypatch.setenv("TWILIO_ESPERA_S", "5")
    with TestClient(app) as c, c.websocket_connect("/twilio/cliente") as pwa:  # un solo bucle, como en producción
        t0 = time.monotonic()
        threading.Timer(0.3, lambda: pwa.send_json({"tipo": "cliente_dice", "texto": "martes bueno"})).start()
        r = c.post("/twilio/espera?n=0")
        assert "formal(martes bueno)" in r.text
        assert time.monotonic() - t0 < 4  # contestó al llegar la respuesta, no al vencer la espera


def test_espera_larga_sin_respuesta_vuelve_a_esperar(sala_falsa, monkeypatch):
    monkeypatch.setenv("TWILIO_ESPERA_S", "0.2")
    r = client.post("/twilio/espera?n=0")
    assert "<Pause" in r.text and "/twilio/espera?n=1" in r.text



def test_responder_durante_la_pausa_larga_la_interrumpe(sala_falsa, monkeypatch):
    """Sin respuesta a tiempo, Twilio queda en <Pause> largo; al responder, la API de Twilio corta la pausa."""
    import app.llamada as llamada

    interrumpidas = []
    monkeypatch.setattr(llamada, "interrumpir_pausa", lambda sid: interrumpidas.append(sid))
    monkeypatch.setenv("TWILIO_ESPERA_S", "0")
    client.post("/twilio/voz", data={"CallSid": "CA_en_curso"})
    r = client.post("/twilio/espera?n=0")
    assert r.text.count('<Pause length="20"/>') >= 20 and sala_falsa.en_pausa_larga  # ~9 min en una sola consulta
    with client.websocket_connect("/twilio/cliente") as pwa:
        pwa.send_json({"tipo": "cliente_dice", "texto": "martes bueno"})
        pwa.send_json({"tipo": "ping"})
    assert interrumpidas == ["CA_en_curso"] and not sala_falsa.en_pausa_larga
    assert "formal(martes bueno)" in client.post("/twilio/espera?n=0").text
