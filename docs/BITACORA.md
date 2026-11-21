# Bitácora del equipo
Las entradas nuevas van **arriba**. Formato:

```
## AAAA-MM-DD HH:MM — Nombre (rama)
- Hice: ...
- Decidí: ...
- Falta / bloqueado: ...
```

## 2026-11-21 — Raimundo / Claude (rama worktree-adrs-arquitectura) — ⚠️ requiere acuerdo del equipo antes de merge
- Hice: 11 ADRs + índice en `docs/adr/` y esqueleto de monorepo en 3 commits separados: (a) ADRs, (b) esqueleto **aditivo** (`apps/ packages/ services/ ml/`, CI, Dockerfiles), (c) **movimiento**: borra `app/` y actualiza CLAUDE.md, ONBOARDING (§3 con mapa de rutas viejas→nuevas, §5, §6), plan.md y contrato.md (solo agrega 2 tipos).
- Decidí (propuesto, Raimundo eligió esto): monorepo pnpm+Turborepo / uv; LiveKit (SIP+Twilio para el teléfono) como tiempo real; PWA Next.js export estático + Capacitor; glosas LSCh como formato intermedio; TTS ElevenLabs; reproductor de señas con clips primero (`ClipSignPlayer`) y avatar 3D después.
- Verificado: `pnpm typecheck` y `pnpm build` OK; `pytest` api (5) y agent (3) OK. No probado con claves reales ni con Docker.
- Falta / bloqueado: **Tomás y el resto deben aceptar (c) antes de mergear**; (a) y (b) se pueden tomar solos. Quien tenga trabajo abierto en `app/backend` o `app/web` debe rebasar con el mapa del ONBOARDING §3. `/llamadas` (SIP saliente) es stub `TODO(v1)`; `agent.py` no se ha corrido contra LiveKit real; voz chilena (`ELEVENLABS_VOICE_ID`) sin elegir; push bloqueado por permisos en esta sesión.

## 2026-11-21 — Tomás / Claude (main)
- Hice: primera investigación v1→v4 en `data/research/` (5 notas). Hallazgos clave: v1 con Twilio Media Streams o ConversationRelay; v2 son 2 prompts con Haiku; v3 y v4 no tienen modelos para LSCh → vocabulario cerrado (MediaPipe + clasificador propio; clips pregrabados por glosa).
- Decidí: el glosario LSCh de los PDFs se estructura a JSONL; si cabe en contexto va entero al prompt con caching, sin vectorizar.
- Falta: ubicar los PDFs y procesarlos; medir STT con audios chilenos reales; definir escenario y lista de señas.

## 2026-11-21 — Tomás (main)
- Hice: clonado el repo de Platanus, scaffold (app/data/docs), backend FastAPI mínimo, plan v1–v4, contrato. Repo personal `tomasnusser/puente-hackaton` con doble push; `main` subido a ambos. Docs de onboarding para los Claudes del equipo.
- Decidí: PWA con Next.js; un solo escenario de demo; solo Tomás despliega (desde su repo personal); el resto pushea al repo de la organización.
- Falta: investigación v1→v4 en `data/research/`, backend/frontend mínimos de prueba, definir escenario de demo y nombre del proyecto, repartir verticales.

## 2026-11-21 — Flujo de llamada entrante (diseño)
- Diagrama 1.1 ahora muestra Twilio → sala por SIP entrante; nuevo diagrama de secuencia en `docs/ARQUITECTURA.md` §1.3.
- Decisión: sala fija por usuario + dispatch rule `direct`; la PWA detecta al participante SIP y avisa. Pendiente: código (`contract.ts`, `apps/web`).
