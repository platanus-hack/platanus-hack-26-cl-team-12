# Hackatón Platanus — Puente (llamadas accesibles para personas sordas)
Equipo de 4. Lo que importa es una **demo funcionando**, no código perfecto.

## Lee primero
- `docs/ONBOARDING.md` (qué hacemos, v1–v4, repos y pushes, cómo unirse), `docs/PRACTICAS-MULTI-CLAUDE.md` y las últimas entradas de `docs/BITACORA.md`.
- Al terminar un bloque de trabajo, anota en `docs/BITACORA.md`.

## Estructura
- `app/backend` FastAPI (telefonía, STT/TTS, LLM). `app/web` Next.js PWA. Es lo que se despliega.
- `data/` investigación, vocabulario, clips y evaluación (no se despliega). `docs/` plan y contrato.
- `app/` no lee de `data/research` ni `docs`.

## Cómo trabajar
- Responde en español chileno (tuteo, sin voseo). Respuestas cortas.
- Actúa sin pedir confirmación en lo reversible. MVP primero: mockea y deja `TODO(real-data)`.
- Una rama por vertical (`v1-telefonia`, `v2-llm`, `v3-vision`, `v4-avatar`), PRs cortos, commits pequeños.
- Secretos solo en `.env` (nunca commitear). Python en `.venv`.
- Contrato entre piezas: `docs/contrato.md`.
