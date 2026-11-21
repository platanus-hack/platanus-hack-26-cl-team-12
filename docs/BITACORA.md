# Bitácora del equipo
Las entradas nuevas van **arriba**. Formato:

```
## AAAA-MM-DD HH:MM — Nombre (rama)
- Hice: ...
- Decidí: ...
- Falta / bloqueado: ...
```

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
