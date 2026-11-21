"""Normalización de frases para la caché (la usan Translator, para la lista blanca, y store.py, para la clave)."""

import re
import unicodedata

_NO_PALABRA = re.compile(r"[^\w\s]|_")


def normalizar_entrada(texto: str) -> str:
    """Sin mayúsculas, tildes ni puntuación: "¿En qué puedo ayudarle?" = "en que puedo ayudarle"."""
    sin_tildes = "".join(c for c in unicodedata.normalize("NFKD", texto.lower()) if not unicodedata.combining(c))
    return " ".join(_NO_PALABRA.sub(" ", sin_tildes).split())
