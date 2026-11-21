"""Tests del cableado de agent.py sin red: LiveKit, Deepgram, ElevenLabs y Anthropic van simulados."""

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
        self.local_participant = FakeParticipant()
        self.handlers = {}

    def on(self, event):
        def deco(fn):
            self.handlers[event] = fn
            return fn

        return deco


class FakeTranslator:
    def __init__(self):
        self.glossary = load_glossary()
        self.calls = []

    def simplificar(self, texto):
        self.calls.append(("simplificar", texto))
        return f"simple: {texto}"

    def glosas_a_espanol(self, glosas):
        self.calls.append(("glosas_a_espanol", glosas))
        return "Quiero una hora."


def test_publish_sends_reliable_json_with_unicode():
    room = FakeRoom()
    asyncio.run(agent.publish(room, {"tipo": "estado", "texto": "médico"}))
    assert room.local_participant.published == [({"tipo": "estado", "texto": "médico"}, True)]


def test_turn_completed_publishes_simplified_text_and_stops_llm():
    room, tr = FakeRoom(), FakeTranslator()
    a = agent.PuenteTranslator(room, tr)
    msg = llm.ChatMessage(role="user", content=["Su hora es el lunes"])
    with pytest.raises(StopResponse):
        asyncio.run(a.on_user_turn_completed(llm.ChatContext(), msg))
    assert room.local_participant.published == [
        ({"tipo": "ejecutivo_dice", "texto": "Su hora es el lunes", "simple": "simple: Su hora es el lunes"}, True)
    ]


def test_turn_completed_with_blank_text_publishes_nothing():
    room, tr = FakeRoom(), FakeTranslator()
    a = agent.PuenteTranslator(room, tr)
    with pytest.raises(StopResponse):
        asyncio.run(a.on_user_turn_completed(llm.ChatContext(), llm.ChatMessage(role="user", content=["   "])))
    assert room.local_participant.published == []
    assert tr.calls == []


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


@pytest.fixture
def wired(monkeypatch):
    """Ejecuta `entrypoint` con todos los servicios externos reemplazados."""
    FakeSession.instances.clear()
    tr = FakeTranslator()
    monkeypatch.setattr(agent, "AgentSession", FakeSession)
    monkeypatch.setattr(agent, "Translator", lambda *a, **k: tr)
    monkeypatch.setattr(agent.anthropic, "Anthropic", lambda: None)
    monkeypatch.setattr(agent.deepgram, "STT", lambda **k: "stt")
    monkeypatch.setattr(agent.elevenlabs, "TTS", lambda **k: "tts")
    monkeypatch.setattr(agent.silero.VAD, "load", staticmethod(lambda: "vad"))

    room = FakeRoom()

    async def connect():
        pass

    ctx = SimpleNamespace(room=room, connect=connect)

    async def run(packets):
        await agent.entrypoint(ctx)
        for p in packets:
            room.handlers["data_received"](p)
        await asyncio.sleep(0.05)  # deja correr las tareas creadas por el handler
        return FakeSession.instances[0], room, tr

    return run


def packet(obj, role):
    participant = SimpleNamespace(identity="p", attributes={"role": role} if role else {})
    return SimpleNamespace(data=json.dumps(obj).encode(), participant=participant)


def test_entrypoint_announces_call_started(wired):
    _, room, _ = asyncio.run(wired([]))
    assert room.local_participant.published[-1][0] == {"tipo": "estado", "valor": "llamada_iniciada"}


def test_entrypoint_speaks_cliente_text_and_glosas(wired):
    session, _, tr = asyncio.run(wired([
        packet({"tipo": "cliente_dice", "texto": "Hola, buenos días"}, "cliente"),
        packet({"tipo": "glosas_cliente", "glosas": ["YO", "QUERER"]}, "cliente"),
    ]))
    assert "Hola, buenos días" in session.said
    assert "Quiero una hora." in session.said
    assert ("glosas_a_espanol", ["YO", "QUERER"]) in tr.calls


def test_entrypoint_drops_messages_without_cliente_role(wired):
    session, _, _ = asyncio.run(wired([
        packet({"tipo": "cliente_dice", "texto": "suplantación"}, "ejecutivo"),
        packet({"tipo": "cliente_dice", "texto": "sin rol"}, None),
        SimpleNamespace(data=b'{"tipo":"cliente_dice","texto":"x"}', participant=None),
    ]))
    assert session.said == []
