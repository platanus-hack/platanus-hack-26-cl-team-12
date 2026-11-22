import pytest


@pytest.fixture(autouse=True)
def sin_llamadas_reales(monkeypatch):
    """Ningún test llama de verdad con Twilio, aunque el .env local tenga credenciales reales."""
    import app.main as main

    def prohibido(*_a, **_k):
        raise AssertionError("Un test intentó hacer una llamada real con Twilio")

    monkeypatch.setattr(main, "llamar_con_twilio", prohibido)
    monkeypatch.delenv("NUMERO_DEMO", raising=False)
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    monkeypatch.setenv("TWILIO_ESPERA_S", "0")  # sin espera larga en los tests (salvo los que la prueban)  # sin voz chilena real en los tests (no gastar ni red)  # que el .env local no cambie los tests
