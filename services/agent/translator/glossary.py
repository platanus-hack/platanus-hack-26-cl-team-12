"""Lee el diccionario de glosas compartido (packages/glosses, ADR-0001)."""

import json
import os
import re
from dataclasses import dataclass
from functools import cached_property
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_PATH = REPO_ROOT / "packages/glosses/data/glosses.json"
# Límites y formatos del contrato: fuente única compartida con la web (packages/glosses/src/contract.ts).
CONTRATO = json.loads((REPO_ROOT / "packages/glosses/data/contrato.json").read_text(encoding="utf-8"))

FINGERSPELL_PREFIX = CONTRATO["deletreo"]["prefijo"]
FINGERSPELL_MAX_LETTERS = CONTRATO["deletreo"]["max_letras"]
_LETTER = CONTRATO["deletreo"]["letras"]
# Formato estricto: DACTILOLOGÍA:A-N-A (hasta 20 letras). Nada de texto libre en el prefijo.
FINGERSPELL_RE = re.compile(
    rf"{re.escape(FINGERSPELL_PREFIX)}[{_LETTER}](?:-[{_LETTER}]){{0,{FINGERSPELL_MAX_LETTERS - 1}}}"
)
_LETTER_RE = re.compile(rf"[{_LETTER}]")

# Datos sin seña (horas, cifras, RUT, nombres) que el reproductor muestra como texto. Solo los emite el agente:
# `is_known` no los acepta, así el cliente no puede colar texto libre al prompt como si fuera una glosa.
LITERAL_PREFIX = CONTRATO["literal"]["prefijo"]
LITERAL_MAX_CHARS = CONTRATO["literal"]["max_chars"]
LITERAL_RE = re.compile(rf"{re.escape(LITERAL_PREFIX)}[{CONTRATO['literal']['caracteres']}]{{1,{LITERAL_MAX_CHARS}}}")


@dataclass(frozen=True)
class Glossary:
    version: int
    entries: dict[str, dict]

    def is_known(self, gloss: str) -> bool:
        return gloss in self.entries or FINGERSPELL_RE.fullmatch(gloss) is not None

    def resolve(self, gloss: str) -> str | None:
        """Forma canónica de una glosa que viene del LLM (mayúsculas, variantes); None si no existe."""
        g = gloss.strip()
        if self.is_known(g):
            return g
        up = g.upper()
        if up in self.entries:
            return up
        return self._variants.get(up)

    @cached_property
    def _variants(self) -> dict[str, str]:
        """Variante → glosa canónica. Se calcula una vez (resolve se llama por cada glosa del LLM)."""
        return {v: g for g, e in self.entries.items() for v in e.get("variants", [])}

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


def literal(dato: str) -> str:
    """`TEXTO:<dato>` válido, o "" si el dato está vacío o trae caracteres no permitidos."""
    out = LITERAL_PREFIX + " ".join(dato.split())[:LITERAL_MAX_CHARS]
    return out if LITERAL_RE.fullmatch(out) else ""


def is_literal(gloss: str) -> bool:
    return LITERAL_RE.fullmatch(gloss) is not None
