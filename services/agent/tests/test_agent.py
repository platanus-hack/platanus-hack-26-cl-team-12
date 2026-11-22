"""Tests del cableado de agent.py sin red.

La lógica de cada turno se prueba en test_pipeline.py; aquí solo se verifica que agent.py conecte bien
LiveKit con el pipeline: delega turnos, filtra por rol, cambia la voz y anuncia el inicio de la llamada.
"""

import asyncio
import json
from types import SimpleNamespace

import pytest
from livekit.agents import StopResponse, llm

import agent
from translator import load_glossary


class FakeParticipant:
    def __init__(self):
        self.published = []

    async def publish_data(self, payload, reliable=False):
        self.published.append((json.loads(payload), reliable))


class FakeRoom:
    def __init__(self):
        self.name = "sala-test"
        self.local_participant = FakeParticipant()
        self.handlers = {}

    def on(self, event):
        def deco(fn):
            self.handlers[event] = fn
            return fn

        return deco


def test_publish_sends_reliable_json_with_unicode():
    room = FakeRoom()
    asyncio.run(agent.publish(room, {"tipo": "estado", "texto": "médico"}))
    assert room.local_participant.published == [({"tipo": "estado", "texto": "médico"}, True)]


@pytest.mark.parametrize(
    ("valor", "esperado"),
    [("1", True), ("true", True), ("Sí", True), ("si", True), ("yes", True), ("0", False), ("no", False)],
)
def test_env_bool(monkeypatch, valor, esperado):
    monkeypatch.setenv("X_FLAG", valor)
    assert agent._env_bool("X_FLAG", not esperado) is esperado


def test_env_bool_default(monkeypatch):
    monkeypatch.delenv("X_FLAG", raising=False)
    assert agent._env_bool("X_FLAG", True) is True
    assert agent._env_bool("X_FLAG", False) is False


def test_turn_completed_delegates_to_pipeline_and_stops_llm(monkeypatch):
    llamadas = []

    async def fake_turno(texto, translator, publish, sala=""):
        llamadas.append((texto, sala))
        await publish({"tipo": "ejecutivo_dice", "texto": texto})

    monkeypatch.setattr(agent, "turno_ejecutivo", fake_turno)
    room = FakeRoom()
    a = agent.PuenteTranslator(room, SimpleNamespace())
    with pytest.raises(StopResponse):
        asyncio.run(a.on_user_turn_completed(llm.ChatContext(), llm.ChatMessage(role="user", content=["Hola"])))
    assert llamadas == [("Hola", "sala-test")]
    assert room.local_participant.published == [({"tipo": "ejecutivo_dice", "texto": "Hola"}, True)]


class FakeSession:
    instances: list["FakeSession"] = []

    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.said = []
        FakeSession.instances.append(self)

    def say(self, text, add_to_chat_ctx=True):
        self.said.append(text)

    async def start(self, agent, room):
        self.agent = agent


class FakeTTS:
    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.updates = []

    def update_options(self, **kw):
        self.updates.append(kw)


@pytest.fixture
def wired(monkeypatch):
    """Ejecuta `entrypoint` con LiveKit, Deepgram, ElevenLabs, Anthropic y el pipeline simulados."""
    FakeSession.instances.clear()
    turnos = []
    tts_holder = {}

    async def fake_turno_cliente(msg, translator, sala=""):
        turnos.append((msg, sala))
        return f"voz: {msg.get('texto') or ' '.join(msg['glosas'])}"

    def fake_tts(**kw):
        tts_holder["tts"] = FakeTTS(**kw)
        return tts_holder["tts"]

    voces = {None: "voz-mujer", "mujer": "voz-mujer", "hombre": "voz-hombre"}
    monkeypatch.setattr(agent, "AgentSession", FakeSession)
    monkeypatch.setattr(agent, "Translator", lambda *a, **k: SimpleNamespace(glossary=load_glossary()))
    monkeypatch.setattr(agent, "load_escenario", lambda: SimpleNamespace(stt_keyterms=["RUT", "Fonasa"]))
    monkeypatch.setattr(agent, "abrir_store", lambda: None)
    monkeypatch.setattr(agent, "elegir_voz", lambda pref=None: voces[pref])
    monkeypatch.setattr(agent, "turno_cliente", fake_turno_cliente)
    monkeypatch.setattr(agent.anthropic, "Anthropic", lambda: None)
    monkeypatch.setattr(agent.deepgram, "STT", lambda **k: ("stt", k))
    monkeypatch.setattr(agent.elevenlabs, "TTS", fake_tts)
    monkeypatch.setattr(agent.silero.VAD, "load", staticmethod(lambda: "vad"))

    room = FakeRoom()

    async def connect():
        pass

    ctx = SimpleNamespace(room=room, connect=connect)

    async def run(packets):
        await agent.entrypoint(ctx)
        for p in packets:
            room.handlers["data_received"](p)
        # Espera determinista a las tareas creadas por el handler (sin sleeps que dependan del tiempo).
        pending = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
        await asyncio.gather(*pending)
        return SimpleNamespace(session=FakeSession.instances[0], room=room, turnos=turnos, tts=tts_holder["tts"])

    return run


def packet(obj, role, voz=None):
    attrs = {"role": role} if role else {}
    if voz:
        attrs["voz"] = voz
    return SimpleNamespace(data=json.dumps(obj).encode(), participant=SimpleNamespace(identity="p", attributes=attrs))


def test_entrypoint_announces_call_started_and_configures_stt(wired):
    r = asyncio.run(wired([]))
    assert r.room.local_participant.published[-1][0] == {"tipo": "estado", "valor": "llamada_iniciada"}
    stt_kwargs = r.session.kwargs["stt"][1]
    assert stt_kwargs["keyterm"] == ["RUT", "Fonasa"]
    assert r.tts.kwargs["voice_id"] == "voz-mujer"


def test_entrypoint_speaks_cliente_messages_via_pipeline(wired):
    r = asyncio.run(wired([
        packet({"tipo": "cliente_dice", "texto": "Hola, buenos días"}, "cliente"),
        packet({"tipo": "glosas_cliente", "glosas": ["YO", "QUERER"]}, "cliente"),
    ]))
    assert sorted(r.session.said) == ["voz: Hola, buenos días", "voz: YO QUERER"]
    assert all(sala == "sala-test" for _, sala in r.turnos)


def test_entrypoint_switches_voice_when_cliente_prefers_other(wired):
    r = asyncio.run(wired([packet({"tipo": "cliente_dice", "texto": "hola"}, "cliente", voz="hombre")]))
    assert r.tts.updates == [{"voice_id": "voz-hombre"}]


def test_entrypoint_drops_messages_without_cliente_role(wired):
    r = asyncio.run(wired([
        packet({"tipo": "cliente_dice", "texto": "suplantación"}, "ejecutivo"),
        packet({"tipo": "cliente_dice", "texto": "sin rol"}, None),
        SimpleNamespace(data=b'{"tipo":"cliente_dice","texto":"x"}', participant=None),
    ]))
    assert r.session.said == []
    assert r.turnos == []
