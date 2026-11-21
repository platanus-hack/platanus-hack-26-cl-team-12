"""Lee el diccionario de glosas compartido (packages/glosses, ADR-0001)."""

import json
import os
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_PATH = REPO_ROOT / "packages/glosses/data/glosses.json"
FINGERSPELL_PREFIX = "DACTILOLOGÍA:"


@dataclass(frozen=True)
class Glossary:
    version: int
    entries: dict[str, dict]

    def is_known(self, gloss: str) -> bool:
        return gloss in self.entries or gloss.startswith(FINGERSPELL_PREFIX)

    def as_prompt(self) -> str:
        """Lista compacta para el prompt de sistema (va con prompt caching)."""
        return "\n".join(f"{g} = {', '.join(e['es'])}" for g, e in self.entries.items())


def load_glossary(path: str | Path | None = None) -> Glossary:
    p = Path(path or os.getenv("GLOSSES_PATH", DEFAULT_PATH))
    data = json.loads(p.read_text(encoding="utf-8"))
    return Glossary(version=data["version"], entries={g["gloss"]: g for g in data["glosses"]})


def fingerspell(word: str) -> str:
    return FINGERSPELL_PREFIX + "-".join(word.upper())
