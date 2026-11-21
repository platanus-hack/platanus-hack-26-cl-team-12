"""Mide precisión (WER) y latencia de ElevenLabs Scribe sobre audios grabados.
Pon los audios en data/eval/audio/ como 01.m4a, 02.m4a... (mismo orden que frases.txt, una frase por archivo).
Uso: python lab/v1_voz/stt_bench.py"""
import sys, time
from pathlib import Path
import httpx, jiwer

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import ROOT, requerir
import os

KEY = requerir("ELEVENLABS_API_KEY")
MODELO = os.getenv("ELEVENLABS_STT_MODEL", "scribe_v1")
AUDIOS = sorted(p for p in (ROOT / "data/eval/audio").iterdir() if p.suffix.lower() in {".m4a", ".mp3", ".wav", ".ogg", ".webm", ".mp4", ".opus"})
FRASES = [l.strip() for l in (Path(__file__).parent / "frases.txt").read_text().splitlines() if l.strip()]

norm = jiwer.Compose([jiwer.ToLowerCase(), jiwer.RemovePunctuation(), jiwer.RemoveMultipleSpaces(), jiwer.Strip()])
refs, hyps = [], []
for audio, ref in zip(AUDIOS, FRASES):
    t0 = time.time()
    r = httpx.post(
        "https://api.elevenlabs.io/v1/speech-to-text",
        headers={"xi-api-key": KEY},
        data={"model_id": MODELO, "language_code": "spa"},
        files={"file": (audio.name, audio.read_bytes())},
        timeout=120,
    )
    r.raise_for_status()
    hip = r.json()["text"]
    seg = time.time() - t0
    w = jiwer.wer(norm(ref), norm(hip))
    refs.append(norm(ref)); hyps.append(norm(hip))
    print(f"\n[{audio.name}] WER={w:.0%}  {seg:.1f}s\n  ref: {ref}\n  stt: {hip}")
if refs:
    print(f"\nWER total ({MODELO}): {jiwer.wer(refs, hyps):.1%} sobre {len(refs)} frases")
else:
    print("No hay audios en data/eval/audio/")
