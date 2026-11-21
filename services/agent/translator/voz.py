"""Voz del cliente por teléfono (B4): qué voz de ElevenLabs usar y cómo escribir el texto para que suene bien.

Las voces vienen de .env (ELEVENLABS_VOICE_ID = mujer, ELEVENLABS_VOICE_ID_HOMBRE) y las pronunciaciones
del escenario (packages/glosses/data/escenarios/<id>.json). Aquí solo queda la lógica.
"""

import os
import re


class VozNoConfigurada(RuntimeError):
    pass


def elegir_voz(preferencia: str | None = None) -> str:
    """voice_id según la preferencia del cliente ("mujer"/"hombre"); si no hay, `VOZ_CLIENTE` (defecto mujer)."""
    genero = (preferencia or os.getenv("VOZ_CLIENTE") or "mujer").strip().lower()
    var = "ELEVENLABS_VOICE_ID_HOMBRE" if genero == "hombre" else "ELEVENLABS_VOICE_ID"
    voz = os.getenv(var) or os.getenv("ELEVENLABS_VOICE_ID")  # sin voz de hombre, usa la principal
    if not voz:
        raise VozNoConfigurada(f"Falta {var} en .env (ver .env.example)")
    return voz


# RUT chileno: 12.345.678-9, 12345678-K, 9.876.543-2
_RUT_RE = re.compile(r"\b(\d{1,2})\.?(\d{3})\.?(\d{3})-([\dkK])\b")
# Hora: 10:30, 9:00 (no toca cifras con punto como 25.000)
_HORA_RE = re.compile(r"\b([01]?\d|2[0-3]):([0-5]\d)\b")
_MONTO_RE = re.compile(r"\$\s?(\d{1,3}(?:\.\d{3})+|\d+)")


def _rut(m: re.Match) -> str:
    millones, miles, unidades, dv = int(m[1]), int(m[2]), int(m[3]), m[4]
    partes = [f"{millones} {'millón' if millones == 1 else 'millones'}"]
    if miles:
        partes.append(f"{miles} mil")
    if unidades:
        partes.append(str(unidades))
    return " ".join(partes) + ", guion " + ("ka" if dv in "kK" else dv)


def _hora(m: re.Match) -> str:
    h, mm = int(m[1]), int(m[2])
    return str(h) if mm == 0 else f"{h} y {mm}"


def normalizar_para_voz(texto: str, pronunciacion: dict[str, str] | None = None) -> str:
    """Escribe el texto como se dice: RUT, horas, montos y palabras del escenario. Lo que ve el cliente no cambia."""
    texto = _RUT_RE.sub(_rut, texto)
    texto = _HORA_RE.sub(_hora, texto)
    texto = _MONTO_RE.sub(lambda m: f"{m[1]} pesos", texto)
    if pronunciacion:
        palabras = re.compile(r"\b(" + "|".join(map(re.escape, sorted(pronunciacion, key=len, reverse=True))) + r")\b")
        texto = palabras.sub(lambda m: pronunciacion[m[1]], texto)
    return texto
