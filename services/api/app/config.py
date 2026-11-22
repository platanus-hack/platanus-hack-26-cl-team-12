"""Configuración de entorno compartida por la API (un solo criterio de producción)."""

import os


def es_produccion() -> bool:
    """API_ENV=production (el Dockerfile lo fija): Swagger apagado y auth que falla cerrada sin secretos."""
    return os.getenv("API_ENV", "development").strip().lower() == "production"
