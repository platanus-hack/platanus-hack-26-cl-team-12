-- Base de datos del agente traductor (services/agent/store.py).
-- SQL estándar: corre en SQLite (hoy) y en Postgres/Supabase (ADR-0009) cambiando REAL por double precision si se quiere.
-- Privacidad (ADR-0010): sin datos personales. La caché no guarda la entrada (solo su hash) y descarta frases con
-- dígitos o nombres propios; las métricas no guardan texto.

-- Traducciones repetidas (frases genéricas del ejecutivo y respuestas rápidas del cliente) sin volver a llamar a Claude.
-- `version` = hash del modelo + system prompt + diccionario: si cambia algo, la caché vieja deja de usarse sola.
CREATE TABLE IF NOT EXISTS traducciones_cache (
  clave      TEXT PRIMARY KEY,          -- sha256(tarea, version, entrada normalizada)
  tarea      TEXT NOT NULL,             -- simplificar | complejizar | espanol_a_glosas
  version    TEXT NOT NULL,
  salida     TEXT NOT NULL,             -- JSON
  creado_en  REAL NOT NULL,             -- epoch s
  usos       INTEGER NOT NULL DEFAULT 0
);

-- Latencia por turno (B6). Sin texto.
CREATE TABLE IF NOT EXISTS turnos (
  id            INTEGER PRIMARY KEY,
  sala          TEXT NOT NULL,
  direccion     TEXT NOT NULL CHECK (direccion IN ('ejecutivo_a_cliente', 'cliente_a_ejecutivo')),
  llm_simple_ms INTEGER,
  llm_glosas_ms INTEGER,
  llm_voz_ms    INTEGER,
  total_ms      INTEGER,
  cache_hit     INTEGER,
  n_glosas      INTEGER,
  n_descartadas INTEGER,
  creado_en     REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS turnos_creado ON turnos (creado_en);

-- Glosas que el LLM quiso usar y no están en el diccionario: guía para crecer el vocabulario (B1).
CREATE TABLE IF NOT EXISTS glosas_faltantes (
  glosa      TEXT PRIMARY KEY,
  veces      INTEGER NOT NULL,
  ultima_vez REAL NOT NULL
);
