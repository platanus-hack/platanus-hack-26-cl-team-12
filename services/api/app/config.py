"""Configuración de entorno compartida por la API (un solo criterio de producción)."""

import os


def es_produccion() -> bool:
    """API_ENV=production (el Dockerfile lo fija): Swagger apagado y auth que falla cerrada sin secretos."""
    return os.getenv("API_ENV", "development").strip().lower() == "production"


def env(k: str) -> str:
    """Variable sin espacios ni comentarios `#`: en el panel de Render es fácil pegar un salto de línea al final,
    y un TWILIO_AUTH_TOKEN con "\\n" hace fallar la firma de TODOS los webhooks (Twilio corta la llamada)."""
    return os.getenv(k, "").split("#")[0].strip()
