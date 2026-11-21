"""Agente traductor de Puente (ADR-0005): participante de la sala de LiveKit.

- Ejecutivo habla (audio SIP/teléfono) → Deepgram STT → Claude simplifica → `ejecutivo_dice` (+ glosas en v4).
- Cliente escribe o firma (data channel) → Claude complejiza → ElevenLabs TTS → el ejecutivo lo escucha.

Escrito contra livekit-agents 1.8.x. Ejecutar:  uv run python agent.py dev
"""

import asyncio
import json
import logging
import os

import anthropic
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import Agent, AgentSession, StopResponse, llm
from livekit.plugins import deepgram, elevenlabs, silero

from guard import parse_cliente_message
from translator import Translator, load_glossary

load_dotenv()
log = logging.getLogger("puente.agent")

ESCENARIO = os.getenv("ESCENARIO_DEMO", "reserva de hora médica")  # TODO: definir escenario final


class PuenteTranslator(Agent):
    """No conversa: solo traduce. Corta la respuesta automática del LLM con StopResponse."""

    def __init__(self, room: rtc.Room, translator: Translator):
        super().__init__(instructions="Traductor entre ejecutivo (voz) y cliente sordo (texto/LSCh).")
        self.room = room
        self.translator = translator

    async def on_user_turn_completed(self, turn_ctx: llm.ChatContext, new_message: llm.ChatMessage) -> None:
        texto = new_message.text_content or ""
        if texto.strip():
            simple = await asyncio.to_thread(self.translator.simplificar, texto)
            await publish(self.room, {"tipo": "ejecutivo_dice", "texto": texto, "simple": simple})
            # TODO(v4): self.translator.espanol_a_glosas(texto) → {"tipo": "glosas_para_senar", ...}
        raise StopResponse()


async def publish(room: rtc.Room, msg: dict) -> None:
    await room.local_participant.publish_data(json.dumps(msg, ensure_ascii=False), reliable=True)


async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()
    translator = Translator(anthropic.Anthropic(), load_glossary(), contexto=ESCENARIO)

    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language=os.getenv("STT_LANGUAGE", "es")),
        tts=elevenlabs.TTS(
            voice_id=os.environ.get("ELEVENLABS_VOICE_ID", "TODO-voz-chilena"),  # ADR-0006
            model=os.getenv("ELEVENLABS_MODEL", "eleven_flash_v2_5"),
            language="es",
        ),
        vad=silero.VAD.load(),
    )

    async def on_cliente(msg: dict):
        if msg["tipo"] == "cliente_dice":
            frase = msg["texto"]  # TODO(v2): complejizar texto libre del cliente
        else:
            frase = await asyncio.to_thread(translator.glosas_a_espanol, msg["glosas"])
        session.say(frase, add_to_chat_ctx=False)

    @ctx.room.on("data_received")
    def _on_data(packet: rtc.DataPacket):
        # El rol lo fija el servidor en el token; un participante no puede autoasignárselo.
        role = packet.participant.attributes.get("role") if packet.participant else None
        msg = parse_cliente_message(packet.data, role, translator.glossary)
        if msg is None:
            log.warning("mensaje descartado de %s", packet.participant.identity if packet.participant else "?")
            return
        asyncio.create_task(on_cliente(msg))

    # TODO(v1): escuchar solo al participante SIP del ejecutivo (room_input_options participant_identity).
    await session.start(agent=PuenteTranslator(ctx.room, translator), room=ctx.room)
    await publish(ctx.room, {"tipo": "estado", "valor": "llamada_iniciada"})


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
