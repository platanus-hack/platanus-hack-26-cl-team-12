"""Base de datos local del agente (SQLite): caché de traducciones, métricas por turno y glosas faltantes.

Por qué SQLite y no Supabase todavía: ADR-0009 propone Supabase, pero aún no hay proyecto. El esquema
(`db/schema.sql`) es SQL estándar y se puede aplicar tal cual en Postgres cuando exista.
TODO(real-data): con DATABASE_URL de Supabase, mover estas tablas allá (A es dueño de esa infra).

Privacidad (ADR-0010): no se guarda nada que identifique a la persona.
- Caché: solo frases de una LISTA BLANCA escrita por el equipo (`frases_frecuentes` del escenario; la aplica el
  Translator). Ningún texto libre de la llamada se guarda. Además, por si acaso: la entrada no se guarda (solo su
  hash), se descarta cualquier entrada o salida con dígitos y hay TTL corto (AGENT_CACHE_TTL_S, defecto 24 h).
- Métricas: solo tiempos y contadores, sin texto.
- Glosas faltantes: solo tokens con forma de glosa (MAYÚSCULAS), sin los que vienen de palabras con mayúscula del
  texto original (posibles nombres; lo filtra pipeline.py) y con purga (AGENT_FALTANTES_TTL_S, defecto 7 días).
"""

import hashlib
import json
import logging
import os
import re
import sqlite3
import threading
import time
from pathlib import Path

from translator.cache_key import normalizar_entrada

SCHEMA = Path(__file__).parent / "db/schema.sql"
DEFAULT_PATH = Path(__file__).parent / ".data/puente.db"
CACHE_TTL_DEFECTO_S = 24 * 3600
FALTANTES_TTL_DEFECTO_S = 7 * 24 * 3600
_DIGITO = re.compile(r"\d")
_FORMA_GLOSA = re.compile(r"[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ0-9-]{0,29}")


def cacheable(texto: str) -> bool:
    """Defensa extra (la garantía es la lista blanca): sin dígitos y de largo razonable."""
    return 0 < len(texto) <= 300 and not _DIGITO.search(texto)


def _textos(v) -> list[str]:
    """Todos los strings de una salida (dict/list anidados), para revisarlos antes de guardar."""
    if isinstance(v, str):
        return [v]
    if isinstance(v, dict):
        return [t for x in v.values() for t in _textos(x)]
    if isinstance(v, list):
        return [t for x in v for t in _textos(x)]
    return []


def huella(*partes: str) -> str:
    return hashlib.sha256("\x1f".join(partes).encode("utf-8")).hexdigest()


class Store:
    def __init__(self, path: str | Path | None = None):
        path = str(path or os.getenv("AGENT_DB_PATH") or DEFAULT_PATH)
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        # El agente llama desde varios hilos (asyncio.to_thread): una conexión con lock basta para la demo.
        self._db = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
        self._lock = threading.Lock()
        self._db.executescript(SCHEMA.read_text(encoding="utf-8"))
        # Se leen aquí (no al importar) para respetar el .env que agent.py carga al iniciar.
        self.cache_ttl_s = int(os.getenv("AGENT_CACHE_TTL_S") or CACHE_TTL_DEFECTO_S)
        self.faltantes_ttl_s = int(os.getenv("AGENT_FALTANTES_TTL_S") or FALTANTES_TTL_DEFECTO_S)

    # ── caché de traducciones ──────────────────────────────────────────────
    def cache_get(self, tarea: str, version: str, entrada: str) -> dict | None:
        if not cacheable(entrada):
            return None
        clave = huella(tarea, version, normalizar_entrada(entrada))
        with self._lock:
            fila = self._db.execute(
                "SELECT salida FROM traducciones_cache WHERE clave = ? AND creado_en > ?",
                (clave, time.time() - self.cache_ttl_s),
            ).fetchone()
            if fila:
                self._db.execute("UPDATE traducciones_cache SET usos = usos + 1 WHERE clave = ?", (clave,))
        return json.loads(fila[0]) if fila else None

    def cache_put(self, tarea: str, version: str, entrada: str, salida: dict) -> None:
        if not cacheable(entrada) or _DIGITO.search(" ".join(_textos(salida))):
            return  # si el modelo agregó cifras, tampoco se guarda
        clave = huella(tarea, version, normalizar_entrada(entrada))
        with self._lock:
            self._db.execute(
                "INSERT INTO traducciones_cache (clave, tarea, version, salida, creado_en, usos) "
                "VALUES (?, ?, ?, ?, ?, 0) "
                "ON CONFLICT(clave) DO UPDATE SET salida = excluded.salida, creado_en = excluded.creado_en",
                (clave, tarea, version, json.dumps(salida, ensure_ascii=False), time.time()),
            )
            self._db.execute("DELETE FROM traducciones_cache WHERE creado_en <= ?", (time.time() - self.cache_ttl_s,))

    # ── métricas por turno (B6) ────────────────────────────────────────────
    def registrar_turno(self, sala: str, direccion: str, **ms) -> None:
        """direccion: 'ejecutivo_a_cliente' | 'cliente_a_ejecutivo'. ms: llm_simple_ms, llm_glosas_ms, total_ms, etc."""
        cols = ("llm_simple_ms", "llm_glosas_ms", "llm_cliente_ms", "total_ms", "cache_hit", "n_glosas", "n_descartadas")
        valores = [ms.get(c) for c in cols]
        with self._lock:
            self._db.execute(
                f"INSERT INTO turnos (sala, direccion, {', '.join(cols)}, creado_en) VALUES (?, ?, {', '.join('?' * len(cols))}, ?)",
                (sala, direccion, *valores, time.time()),
            )

    def resumen_latencia(self) -> list[dict]:
        with self._lock:
            filas = self._db.execute(
                "SELECT direccion, COUNT(*), AVG(total_ms), MAX(total_ms), AVG(cache_hit) FROM turnos GROUP BY direccion"
            ).fetchall()
        return [
            {"direccion": d, "turnos": n, "promedio_ms": round(p or 0), "max_ms": round(m or 0), "tasa_cache": round(c or 0, 2)}
            for d, n, p, m, c in filas
        ]

    # ── glosas que el LLM pidió y no existen (para crecer el vocabulario, B1) ─
    def registrar_faltantes(self, glosas: list[str]) -> None:
        validas = [g for g in glosas if isinstance(g, str) and _FORMA_GLOSA.fullmatch(g)]
        if not validas:
            return
        with self._lock:
            self._db.executemany(
                "INSERT INTO glosas_faltantes (glosa, veces, ultima_vez) VALUES (?, 1, ?) "
                "ON CONFLICT(glosa) DO UPDATE SET veces = veces + 1, ultima_vez = excluded.ultima_vez",
                [(g, time.time()) for g in validas],
            )
            self._db.execute("DELETE FROM glosas_faltantes WHERE ultima_vez <= ?", (time.time() - self.faltantes_ttl_s,))

    def glosas_faltantes(self, limite: int = 20) -> list[tuple[str, int]]:
        with self._lock:
            return self._db.execute(
                "SELECT glosa, veces FROM glosas_faltantes ORDER BY veces DESC, glosa LIMIT ?", (limite,)
            ).fetchall()


def abrir_store() -> Store | None:
    """Store del agente; None si AGENT_DB_PATH=off (la traducción funciona igual sin base de datos)."""
    if os.getenv("AGENT_DB_PATH", "").lower() == "off":
        return None
    try:
        return Store()
    except (OSError, sqlite3.Error) as e:
        # Ej. contenedor con sistema de archivos de solo lectura: se sigue sin caché ni métricas.
        logging.getLogger("puente.store").warning("sin base de datos (%s); usa AGENT_DB_PATH=/tmp/puente.db", e)
        return None
