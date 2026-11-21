"""Puente — simulación de llamada en el navegador (sin Twilio).
Ejecutivo (pestaña /ejecutivo, micrófono) <-> backend <-> Cliente (pestaña /cliente, chat).
Correr:  cd app/backend && uvicorn main:app --reload --port 8000
TODO(real-data): cambiar la entrada de audio del ejecutivo por Twilio Media Streams."""
import asyncio, base64, json, os, sys, time
from pathlib import Path

import anthropic, httpx
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT / "lab" / "v2_simplificar"))
from prompts import SIMPLIFICAR, COMPLEJIZAR  # noqa: E402  (fuente única de los prompts)

MODELO_LLM = os.getenv("MODELO_LLM", "claude-haiku-5-5")
STT_MODEL = os.getenv("ELEVENLABS_STT_MODEL", "scribe_v1")
TTS_MODEL = os.getenv("ELEVENLABS_TTS_MODEL", "eleven_flash_v2_5")
EL_KEY = os.getenv("ELEVENLABS_API_KEY", "")
EL_VOZ = os.getenv("ELEVENLABS_VOICE_ID", "")

app = FastAPI(title="Puente")
llm = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
http = httpx.AsyncClient(timeout=60)
salas: dict[str, set[WebSocket]] = {"ejecutivo": set(), "cliente": set()}
STATIC = Path(__file__).parent / "static"


async def enviar(rol: str, msg: dict):
    for ws in list(salas[rol]):
        try:
            await ws.send_json(msg)
        except Exception:
            salas[rol].discard(ws)


async def stt(audio: bytes, mime: str) -> str:
    ext = "webm" if "webm" in mime else "mp4" if "mp4" in mime else "ogg"
    r = await http.post(
        "https://api.elevenlabs.io/v1/speech-to-text",
        headers={"xi-api-key": EL_KEY},
        data={"model_id": STT_MODEL, "language_code": "spa"},
        files={"file": (f"a.{ext}", audio, mime or "audio/webm")},
    )
    r.raise_for_status()
    return r.json()["text"].strip()


async def tts(texto: str) -> bytes:
    r = await http.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{EL_VOZ}",
        params={"output_format": "mp3_44100_64"},
        headers={"xi-api-key": EL_KEY},
        json={"text": texto, "model_id": TTS_MODEL, "language_code": "es"},
    )
    r.raise_for_status()
    return r.content


async def reescribir(sistema: str, texto: str) -> str:
    r = await llm.messages.create(
        model=MODELO_LLM, max_tokens=300, system=sistema,
        messages=[{"role": "user", "content": texto}],
    )
    return "".join(b.text for b in r.content if b.type == "text").strip()


async def desde_ejecutivo(m: dict):
    t0 = time.time()
    texto = await stt(base64.b64decode(m["data"]), m.get("mime", ""))
    t_stt = time.time() - t0
    if not texto:
        await enviar("ejecutivo", {"tipo": "transcripcion", "texto": "(no se entendió nada)"})
        return
    await enviar("ejecutivo", {"tipo": "transcripcion", "texto": texto})
    simple, t_llm = None, 0.0
    if m.get("v2"):
        t1 = time.time()
        simple = await reescribir(SIMPLIFICAR, texto)
        t_llm = time.time() - t1
    await enviar("cliente", {"tipo": "ejecutivo_dice", "texto": texto, "simple": simple,
                             "ms": {"stt": round(t_stt * 1000), "llm": round(t_llm * 1000)}})


async def desde_cliente(m: dict):
    texto = m["texto"].strip()
    if not texto:
        return
    natural, t_llm = texto, 0.0
    if m.get("v2"):
        t0 = time.time()
        natural = await reescribir(COMPLEJIZAR, texto)
        t_llm = time.time() - t0
    t1 = time.time()
    audio = await tts(natural)
    t_tts = time.time() - t1
    ms = {"llm": round(t_llm * 1000), "tts": round(t_tts * 1000)}
    await enviar("cliente", {"tipo": "enviado", "texto": texto, "natural": natural, "ms": ms})
    await enviar("ejecutivo", {"tipo": "cliente_dice", "texto": natural,
                               "audio": base64.b64encode(audio).decode(), "ms": ms})


@app.websocket("/ws/{rol}")
async def ws_endpoint(ws: WebSocket, rol: str):
    if rol not in salas:
        await ws.close(); return
    await ws.accept()
    salas[rol].add(ws)
    manejador = desde_ejecutivo if rol == "ejecutivo" else desde_cliente
    try:
        while True:
            m = json.loads(await ws.receive_text())
            try:
                await manejador(m)
            except Exception as e:  # no tumbar la sala por un error de API
                await ws.send_json({"tipo": "error", "texto": f"{type(e).__name__}: {e}"})
    except WebSocketDisconnect:
        pass
    finally:
        salas[rol].discard(ws)


@app.get("/health")
def health():
    return {"ok": True, "stt": STT_MODEL, "tts": TTS_MODEL, "llm": MODELO_LLM,
            "claves": {"elevenlabs": bool(EL_KEY and EL_VOZ), "anthropic": bool(os.getenv("ANTHROPIC_API_KEY"))}}


@app.get("/{pagina}")
def pagina(pagina: str):
    f = STATIC / f"{pagina}.html"
    return FileResponse(f) if f.exists() else FileResponse(STATIC / "index.html")
