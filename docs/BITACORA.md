# Bitácora del equipo
Las entradas nuevas van **arriba**. Formato:

```
## AAAA-MM-DD HH:MM — Nombre (rama)
- Hice: ...
- Decidí: ...
- Falta / bloqueado: ...
```

## 2026-11-21 — Claude (data-glosario)
- Hice: glosario LSCh **A-H** extraído del PDF (UMCE 2009): 1057 entradas en `data/vocab/glosario.jsonl`, las 1057 con foto recortada (`data/signs/img/`, gitignored), más `glosario.md`, `glosario_compacto.txt` (33 KB, cabe entero en un prompt) y README. Todo local con pymupdf, **0 USD de API**; scripts en `data/vocab/scripts/` (`extract.py`, `build.py`), se regenera en segundos.
- Decidí: el PDF trae texto seleccionable y fotos incrustadas, así que no se necesita visión de Claude. `escenario` (salud 37, banco 19) es heurística por palabras clave: revisar. El diccionario NO describe cómo se hace la seña ni trae categorías por tema: `descripcion_seña` y `categoría` quedan en null (la seña está en la foto).
- Falta / bloqueado: procesar `Diccionario_LSCh_I-Z.pdf` (mismo script). **Licencia:** los créditos dicen "Prohibida la reproducción total o parcial de los textos, sin expresa autorización de las autoras": decidir si se pushea el texto extraído a un repo público. Sin push ni PR hasta que Tomás confirme.

## 2026-11-21 — Raimundo / Claude (rama worktree-adrs-arquitectura) — ⚠️ requiere acuerdo del equipo antes de merge
- Hice: 11 ADRs + índice en `docs/adr/` y esqueleto de monorepo en 3 commits separados: (a) ADRs, (b) esqueleto **aditivo** (`apps/ packages/ services/ ml/`, CI, Dockerfiles), (c) **movimiento**: borra `app/` y actualiza CLAUDE.md, ONBOARDING (§3 con mapa de rutas viejas→nuevas, §5, §6), plan.md y contrato.md (solo agrega 2 tipos).
- Decidí (propuesto, Raimundo eligió esto): monorepo pnpm+Turborepo / uv; LiveKit (SIP+Twilio para el teléfono) como tiempo real; PWA Next.js export estático + Capacitor; glosas LSCh como formato intermedio; TTS ElevenLabs; reproductor de señas con clips primero (`ClipSignPlayer`) y avatar 3D después.
- Verificado: `pnpm typecheck` y `pnpm build` OK; `pytest` api (5) y agent (3) OK. No probado con claves reales ni con Docker.
- Falta / bloqueado: **Tomás y el resto deben aceptar (c) antes de mergear**; (a) y (b) se pueden tomar solos. Quien tenga trabajo abierto en `app/backend` o `app/web` debe rebasar con el mapa del ONBOARDING §3. `/llamadas` (SIP saliente) es stub `TODO(v1)`; `agent.py` no se ha corrido contra LiveKit real; voz chilena (`ELEVENLABS_VOICE_ID`) sin elegir; push bloqueado por permisos en esta sesión.

## 2026-11-21 — Tomás / Claude (lab-v1-v2)
- Hice: simulación de llamada en el navegador (sin Twilio): `app/backend/main.py` (FastAPI + WebSocket) con páginas `/ejecutivo` (micrófono → Scribe) y `/cliente` (chat). Checkbox v2 activa simplificar/naturalizar. Probado de punta a punta por WebSocket: STT ~0,5 s, LLM ~1 s, TTS ~0,6 s. Prompt de "complejizar" afinado (suena normal, sin agregados). Scribe: 7/10 frases perfectas con audio de WhatsApp.
- Decidí: simular al ejecutivo en el navegador hasta decidir el upgrade de Twilio (pide cargar saldo).
- Falta: probar con micrófono real en el navegador, STT en streaming, Twilio real, v3/v4.

## 2026-11-21 — Tomás / Claude (main)
- Hice: primera investigación v1→v4 en `data/research/` (5 notas). Hallazgos clave: v1 con Twilio Media Streams o ConversationRelay; v2 son 2 prompts con Haiku; v3 y v4 no tienen modelos para LSCh → vocabulario cerrado (MediaPipe + clasificador propio; clips pregrabados por glosa).
- Decidí: el glosario LSCh de los PDFs se estructura a JSONL; si cabe en contexto va entero al prompt con caching, sin vectorizar.
- Falta: ubicar los PDFs y procesarlos; medir STT con audios chilenos reales; definir escenario y lista de señas.

## 2026-11-21 — Tomás (main)
- Hice: clonado el repo de Platanus, scaffold (app/data/docs), backend FastAPI mínimo, plan v1–v4, contrato. Repo personal `tomasnusser/puente-hackaton` con doble push; `main` subido a ambos. Docs de onboarding para los Claudes del equipo.
- Decidí: PWA con Next.js; un solo escenario de demo; solo Tomás despliega (desde su repo personal); el resto pushea al repo de la organización.
- Falta: investigación v1→v4 en `data/research/`, backend/frontend mínimos de prueba, definir escenario de demo y nombre del proyecto, repartir verticales.

## 2026-11-21 — Tomás (lab-v1-v2) · v4 con fotos del diccionario
- Hice: lista cerrada de 79 glosas para "pedir hora al doctor" (`data/vocab/escenario_hora_medica.json`, generada con `lab/v4_avatar/build_escenario.py` desde el glosario). Backend: frase del ejecutivo → Haiku → secuencia de ids (`lab/v4_avatar/prompts.py`, `a_glosas` en main.py, `POST /api/glosas` para probar sin micrófono). `/cliente` tiene un reproductor que muestra las fotos en secuencia (1,3 s c/u, repetir, chips). Checkbox v4 en `/ejecutivo` y `/cliente`.
- Decidí: horas, cifras y nombres propios salen como texto grande (el diccionario no trae números ni letras). Haiku "piensa": en v4 usar max_tokens 1500 (con 300 a veces devolvía vacío).
- Falta: números y deletreo (grabar clips propios); revisar con una persona señante que el orden de glosas sea LSCh razonable; fotos son estáticas (no muestran movimiento). Las fotos NO se versionan (derechos UMCE): se copian con build_escenario.py desde la carpeta del glosario a `data/signs/img/`.
