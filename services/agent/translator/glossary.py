"""Lee el diccionario de glosas compartido (packages/glosses, ADR-0001)."""

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_PATH = REPO_ROOT / "packages/glosses/data/glosses.json"
FINGERSPELL_PREFIX = "DACTILOLOGÍA:"
FINGERSPELL_MAX_LETTERS = 20
_LETTER = "A-ZÁÉÍÓÚÜÑ"
# Formato estricto: DACTILOLOGÍA:A-N-A (hasta 20 letras). Nada de texto libre en el prefijo.
FINGERSPELL_RE = re.compile(
    rf"{re.escape(FINGERSPELL_PREFIX)}[{_LETTER}](?:-[{_LETTER}]){{0,{FINGERSPELL_MAX_LETTERS - 1}}}"
)
_LETTER_RE = re.compile(rf"[{_LETTER}]")


@dataclass(frozen=True)
class Glossary:
    version: int
    entries: dict[str, dict]

    def is_known(self, gloss: str) -> bool:
        return gloss in self.entries or FINGERSPELL_RE.fullmatch(gloss) is not None

    def as_prompt(self) -> str:
        """Lista compacta para el prompt de sistema (va con prompt caching)."""
        return "\n".join(f"{g} = {', '.join(e['es'])}" for g, e in self.entries.items())


def load_glossary(path: str | Path | None = None) -> Glossary:
    p = Path(path or os.getenv("GLOSSES_PATH", DEFAULT_PATH))
    data = json.loads(p.read_text(encoding="utf-8"))
    return Glossary(version=data["version"], entries={g["gloss"]: g for g in data["glosses"]})


def fingerspell(word: str) -> str:
    """Deletreo manual de una palabra; "" si no tiene letras deletreables. Solo letras, máx. 20."""
    letters = [c for c in word.upper() if _LETTER_RE.fullmatch(c)][:FINGERSPELL_MAX_LETTERS]
    return FINGERSPELL_PREFIX + "-".join(letters) if letters else ""
