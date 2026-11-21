# Hackatón Platanus — Puente (llamadas accesibles para personas sordas)
Equipo de 4. Lo que importa es una **demo funcionando**, no código perfecto.

## Lee primero
- `docs/ONBOARDING.md` (qué hacemos, v1–v4, repos y pushes, cómo unirse), `docs/PRACTICAS-MULTI-CLAUDE.md` y las últimas entradas de `docs/BITACORA.md`.
- `docs/PLAN-TRABAJO.md` (quién es dueño de qué carpeta y requerimientos por persona).
- Al terminar un bloque de trabajo, anota en `docs/BITACORA.md`.

## Estructura
- Monorepo (ver `docs/adr/`): `apps/` (web PWA Next.js, mobile Capacitor, desktop Tauri), `packages/` (glosses, signs, avatar, ui), `services/` (api FastAPI, agent LiveKit + traductor Claude), `ml/` (entrenamiento). Es lo que se despliega.
- `data/` investigación, vocabulario, clips y evaluación (no se despliega). `docs/` plan y contrato.
- `apps/`, `packages/` y `services/` no leen de `data/research` ni `docs`.
- Rutas viejas → nuevas: ver el mapa en `docs/ONBOARDING.md` §3.
- JS: `pnpm install`, `pnpm typecheck`, `pnpm build`. Python: `uv --directory services/<api|agent> run pytest`.

## Cómo trabajar
- Responde en español chileno (tuteo, sin voseo). Respuestas cortas.
- Actúa sin pedir confirmación en lo reversible. MVP primero: mockea y deja `TODO(real-data)`.
- Una rama por vertical (`v1-telefonia`, `v2-llm`, `v3-vision`, `v4-avatar`), PRs cortos, commits pequeños.
- Secretos solo en `.env` (nunca commitear). Python en `.venv`.
- Contrato entre piezas: `docs/contrato.md`.
