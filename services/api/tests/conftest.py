import pytest


@pytest.fixture(autouse=True)
def sin_llamadas_reales(monkeypatch):
    """Ningún test llama de verdad con Twilio, aunque el .env local tenga credenciales reales."""
    import app.main as main

    def prohibido(*_a, **_k):
        raise AssertionError("Un test intentó hacer una llamada real con Twilio")

    monkeypatch.setattr(main, "llamar_con_twilio", prohibido)
    monkeypatch.delenv("NUMERO_DEMO", raising=False)  # que el .env local no cambie los tests
