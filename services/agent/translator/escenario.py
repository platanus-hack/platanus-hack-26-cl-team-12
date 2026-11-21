"""Escenario de la demo como datos (packages/glosses/data/escenarios/<id>.json), no como código.

Cambiar de escenario (banco, hora médica…) = agregar un JSON y poner ESCENARIO=<id> en .env.
"""

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

from .glossary import REPO_ROOT

ESCENARIOS_DIR = REPO_ROOT / "packages/glosses/data/escenarios"
DEFAULT_ID = "hora_medica"


@dataclass(frozen=True)
class Escenario:
    id: str
    descripcion: str
    stt_keyterms: list[str] = field(default_factory=list)
    pronunciacion: dict[str, str] = field(default_factory=dict)
    ejemplos: dict[str, list[dict]] = field(default_factory=dict)


def load_escenario(path_o_id: str | Path | None = None) -> Escenario:
    """Por id (`hora_medica`) o ruta a un JSON. Por defecto: ESCENARIO_PATH, luego ESCENARIO, luego hora_medica."""
    ref = str(path_o_id or os.getenv("ESCENARIO_PATH") or os.getenv("ESCENARIO") or DEFAULT_ID)
    p = Path(ref) if ref.endswith(".json") else ESCENARIOS_DIR / f"{ref}.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    return Escenario(
        id=data["id"],
        descripcion=data["descripcion"],
        stt_keyterms=list(data.get("stt_keyterms", [])),
        pronunciacion=dict(data.get("pronunciacion", {})),
        ejemplos={k: list(v) for k, v in data.get("ejemplos", {}).items()},
    )
