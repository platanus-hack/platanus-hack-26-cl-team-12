import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

MODELO_LLM = os.getenv("MODELO_LLM", "claude-haiku-5-5")


def requerir(nombre: str) -> str:
    v = os.getenv(nombre)
    if not v:
        raise SystemExit(f"Falta {nombre} en .env (ver .env.example)")
    return v
