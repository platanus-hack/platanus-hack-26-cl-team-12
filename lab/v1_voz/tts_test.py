"""Genera audio con ElevenLabs para una frase y mide la latencia al primer byte.
Uso: python lab/v1_voz/tts_test.py "texto" [formato]   (formato: mp3_44100_128 | ulaw_8000)"""
import os, sys, time
from pathlib import Path
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import ROOT, requerir

KEY = requerir("ELEVENLABS_API_KEY")
VOZ = os.getenv("ELEVENLABS_VOICE_ID", "")  # TODO: elegir voz en español en elevenlabs.io/app/voice-library
MODELO = os.getenv("ELEVENLABS_TTS_MODEL", "eleven_flash_v2_5")
texto = sys.argv[1] if len(sys.argv) > 1 else "Hola, buenos días. Quisiera reservar una hora médica, por favor."
fmt = sys.argv[2] if len(sys.argv) > 2 else "mp3_44100_128"
if not VOZ:
    raise SystemExit("Define ELEVENLABS_VOICE_ID en .env")

out = ROOT / "data/eval" / ("tts_prueba." + ("ulaw" if fmt.startswith("ulaw") else "mp3"))
t0 = time.time(); primero = None; n = 0
with httpx.stream("POST", f"https://api.elevenlabs.io/v1/text-to-speech/{VOZ}/stream",
                  params={"output_format": fmt},
                  headers={"xi-api-key": KEY},
                  json={"text": texto, "model_id": MODELO, "language_code": "es"}, timeout=60) as r:
    r.raise_for_status()
    with open(out, "wb") as f:
        for chunk in r.iter_bytes():
            if primero is None:
                primero = time.time() - t0
            f.write(chunk); n += len(chunk)
print(f"Primer byte: {primero:.2f}s · total {time.time()-t0:.2f}s · {n} bytes → {out}")
