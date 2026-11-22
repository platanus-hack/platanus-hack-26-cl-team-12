"""Agente traductor de Puente (ADR-0005): participante de la sala de LiveKit.

- Ejecutivo habla (audio SIP/teléfono) → Deepgram STT → Claude simplifica (+ glosas) → `ejecutivo_dice` + `glosas_para_senar`.
- Cliente escribe o firma (data channel) → Claude complejiza → ElevenLabs TTS (voz chilena) → el ejecutivo lo escucha.

La lógica de cada turno está en pipeline.py; aquí solo se conecta LiveKit. Todo lo configurable viene de .env
(ver .env.example) y del escenario (packages/glosses/data/escenarios/<ESCENARIO>.json).

Escrito contra livekit-agents 1.8.x. Ejecutar:  uv run python agent.py dev
"""

import asyncio
import json
import logging
import os

import anthropic
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import NOT_GIVEN, Agent, AgentSession, StopResponse, llm
from livekit.plugins import deepgram, elevenlabs, silero

from guard import parse_cliente_message
from pipeline import turno_cliente, turno_ejecutivo
from store import abrir_store
from translator import Translator, load_escenario, load_glossary
from translator.voz import elegir_voz

load_dotenv()
log = logging.getLogger("puente.agent")

# livekit-agents precarga por defecto el modelo de fin de turno (~450 MB) en cada ejecutor de llamadas, aunque no lo
# usemos (el turno lo marca el VAD de Silero, que cargamos en prewarm). Con eso el agente pasaba de 600 MB y en
# Render Starter (512 MB) el sistema lo mataba al arrancar, sin dejar error. "0" lo apaga; el .env puede cambiarlo.
os.environ.setdefault("LIVEKIT_AGENTS_PRELOAD_LOCAL_INFERENCE", "0")


def _env_bool(nombre: str, defecto: bool) -> bool:
    return os.getenv(nombre, str(defecto)).strip().lower() in ("1", "true", "sí", "si", "yes")


class PuenteTranslator(Agent):
    """No conversa: solo traduce. Corta la respuesta automática del LLM con StopResponse."""

    def __init__(self, room: rtc.Room, translator: Translator):
        super().__init__(instructions="Traductor entre ejecutivo (voz) y cliente sordo (texto/LSCh).")
        self.room = room
        self.translator = translator

    async def on_user_turn_completed(self, turn_ctx: llm.ChatContext, new_message: llm.ChatMessage) -> None:
        texto = new_message.text_content or ""
        await turno_ejecutivo(texto, self.translator, lambda m: publish(self.room, m), sala=self.room.name)
        raise StopResponse()


async def publish(room: rtc.Room, msg: dict) -> None:
    await room.local_participant.publish_data(json.dumps(msg, ensure_ascii=False), reliable=True)


def prewarm(proc: agents.JobProcess) -> None:
    """Una vez por proceso (no por llamada): el VAD, el diccionario y el escenario no cambian entre llamadas."""
    proc.userdata["vad"] = silero.VAD.load()
    proc.userdata["glossary"] = load_glossary()
    proc.userdata["escenario"] = load_escenario()


async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()
    escenario = ctx.proc.userdata["escenario"]
    translator = Translator(anthropic.Anthropic(), ctx.proc.userdata["glossary"], escenario, store=abrir_store())
    voz_actual = elegir_voz()

    tts = elevenlabs.TTS(
        # El plugin lee ELEVEN_API_KEY por su cuenta; nuestra variable (heredada del scaffold) es ELEVENLABS_API_KEY.
        # Si no está, NOT_GIVEN deja que el plugin use ELEVEN_API_KEY.
        api_key=os.getenv("ELEVENLABS_API_KEY") or NOT_GIVEN,
        voice_id=voz_actual,  # ADR-0006
        model=os.getenv("ELEVENLABS_MODEL", "eleven_flash_v2_5"),
        language=os.getenv("TTS_LANGUAGE", "es"),
    )
    session = AgentSession(
        stt=deepgram.STT(
            model=os.getenv("STT_MODEL", "nova-3"),
            language=os.getenv("STT_LANGUAGE", "es"),
            # "diez y media" → "10:30": el LLM conserva cifras exactas y el cliente las ve como número.
            smart_format=_env_bool("STT_SMART_FORMAT", True),
            keyterm=escenario.stt_keyterms or NOT_GIVEN,  # términos del escenario (RUT, Fonasa, box…)
        ),
        tts=tts,
        vad=ctx.proc.userdata["vad"],
    )

    tareas: set[asyncio.Task] = set()

    async def on_cliente(msg: dict, preferencia_voz: str | None):
        nonlocal voz_actual
        voz = elegir_voz(preferencia_voz)
        if voz != voz_actual:  # el cliente eligió voz de mujer u hombre (atributo `voz` de su participante)
            tts.update_options(voice_id=voz)
            voz_actual = voz
        frase = await turno_cliente(msg, translator, sala=ctx.room.name)
        session.say(frase, add_to_chat_ctx=False)

    @ctx.room.on("data_received")
    def _on_data(packet: rtc.DataPacket):
        # El rol lo fija el servidor en el token; un participante no puede autoasignárselo.
        attrs = packet.participant.attributes if packet.participant else {}
        msg = parse_cliente_message(packet.data, attrs.get("role"), translator.glossary)
        if msg is None:
            log.warning("mensaje descartado de %s", packet.participant.identity if packet.participant else "?")
            return
        # TODO(v1): que /token permita fijar el atributo `voz` ("mujer"/"hombre") según la preferencia del cliente.
        # Guardar la referencia: sin ella el GC puede botar el task a mitad de camino (RUF006).
        tarea = asyncio.create_task(on_cliente(msg, attrs.get("voz")))
        tareas.add(tarea)
        tarea.add_done_callback(tareas.discard)

    # TODO(v1): escuchar solo al participante SIP del ejecutivo (room_input_options participant_identity).
    await session.start(agent=PuenteTranslator(ctx.room, translator), room=ctx.room)
    await publish(ctx.room, {"tipo": "estado", "valor": "llamada_iniciada"})


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            # Llamadas en hilos del mismo proceso, no en procesos aparte: con procesos (forkserver + uno en espera)
            # el agente usa ~780 MB y en Render Starter (512 MB) el sistema lo mata al arrancar, sin dejar error.
            # Con hilos no hay aislamiento entre llamadas, que para la demo (una a la vez) no importa.
            # AGENT_EXECUTOR=process vuelve al modo de LiveKit por defecto (para planes con más memoria).
            job_executor_type=agents.JobExecutorType(os.getenv("AGENT_EXECUTOR", "thread")),
            # En producción LiveKit deja uno en espera por CPU *del host* (no del plan): se fija en 1.
            num_idle_processes=int(os.getenv("AGENT_IDLE_PROCESSES", "1")),
            # Cargar el VAD en una CPU compartida puede pasar de los 10 s por defecto.
            initialize_process_timeout=float(os.getenv("AGENT_INIT_TIMEOUT_S", "30")),
        )
    )
