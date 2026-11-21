# Bitácora del equipo
Las entradas nuevas van **arriba**. Formato:

```
## AAAA-MM-DD HH:MM — Nombre (rama)
- Hice: ...
- Decidí: ...
- Falta / bloqueado: ...
```

## 2026-11-21 — Rafael / Claude (v4-avatar) · guion de la demo y look de app nativa
- Decidí (Rafael): guion fijo de la demo, caída de un niño con el codo quebrado (habla primero la persona sorda). Mientras el otro lado responde no se muestran respuestas rápidas.
- Hice: simulador con ese guion (frase inicial lista para tocar al contestar, una respuesta del guion por turno, "Repita" repite, termina sola). Indicador "Urgencias está respondiendo". Intérprete dibujado como videollamada (ropa oscura y fondo liso, manos que se mueven al hacer señas, subtítulo encima). Look de app nativa: tipografía del sistema (San Francisco/Roboto), título grande, botón rojo de urgencia, lista agrupada, barra de pestañas (Historial y Perfil sin contenido todavía), burbujas de mensajería, caja de texto redonda con botón de enviar, Colgar redondo. Sin el indicador "N" de Next en desarrollo. Revisado con capturas automáticas en tamaño iPhone.
- Falta: frases del guion > 40 caracteres (el agente real limita `opciones` a 40; pedir a B). Vocabulario de urgencias (hijo, sangre, brazo, ambulancia no tienen seña). Intérprete real = fotos/clips (D5).

## 2026-11-21 — Rafael / Claude (v4-avatar) · demo de urgencia
- Decidí (Rafael): **la demo se enfoca solo en la persona sorda llamando a urgencias de la clínica para pedir una ambulancia**. La llamada entrante queda guardada (`IncomingCall` sigue en `packages/ui`) pero fuera del flujo.
- Hice: inicio con un solo botón grande "Pedir una ambulancia". Pantalla de llamada que cabe entera sin bajar: arriba quién, estado y Colgar; el avatar siempre visible con lo último que dijeron encima; el chat baja solo; abajo, fijas, las respuestas rápidas y la caja para escribir. Las respuestas rápidas usan `ejecutivo_dice.opciones` cuando vienen (si no, Sí/No/Repita/Más lento). Quité las glosas bajo el avatar. Simulador con guion de urgencia (emergencia, dirección, si respira, ambulancia en 10 min, instrucciones); "Repita, por favor" repite la última frase. Mergeé `dev` (v2 de Raimundo).
- Falta: mostrar `TEXTO:` en grande cuando llegue el reproductor real (D5). Pedir a B un escenario `urgencia` (vocabulario y frases); hoy el agente está armado para hora médica.

## 2026-11-21 — Rafael / Claude (v4-avatar) · llamada entrante primero
- Decidí (Rafael): **la versión 1 es la llamada entrante**. La clínica llama a la persona sorda, ve la pantalla de llamada y contesta deslizando a la izquierda; ahí se abre la app con el texto y el avatar. **La versión 2 es la saliente** (la persona llama a la clínica). Por ahora solo salud (clínica, CESFAM, Fonasa).
- Hice: `IncomingCall` en `packages/ui` (pantalla completa, borde que destella y pulso en vez de timbre, vibración en Android, deslizar para contestar, Rechazar). En `?mock=1` la clínica "llama" a los 3 s de abrir la app, con un guion de confirmación de hora. Tema pastel por defecto, inicio con destinos de salud, aviso de conexión quitado (redundante con "En llamada" + duración), avatar grande con el subtítulo encima.
- Falta / bloqueado: en producción el aviso llega como push / `call.incoming` (lo define A en el contrato). Una web no puede reemplazar la pantalla nativa de llamada del celular: para eso hace falta Capacitor + CallKit/ConnectionService.

## 2026-11-21 — Rafael / Claude (v4-avatar)
- Hice: D2 y D3. Pantalla de llamada (`apps/web/src/components/CallPanel.tsx`): Llamar/Colgar, estado con contador, avisos, subtítulos (simple + original), escribir o tocar respuesta rápida → `cliente_dice`, y el avatar de ejemplo cuando llega `glosas_para_senar`. Modo `?mock=1` (`apps/web/src/lib/mockCall.ts`): llamada simulada de hora médica, el ejecutivo responde cada vez que el cliente dice algo.
- Decidí: el simulador implementa la misma interfaz que `joinCall`, así la pantalla es igual con o sin backend. El texto del cliente se agrega a los subtítulos al enviarlo (el agente no lo devuelve).
- Falta: probar contra el agente real (Sync 1). D5 con `ClipSignPlayer` / fotos de `lab/v4_avatar`.

## 2026-11-21 — Raimundo / Claude (v2/traduccion-voz-vocab)
- Hice: v2 en el agente real. **Vocabulario:** `glosses.json` pasa a 81 glosas de hora médica (las 12 originales conservan su `classifierLabel`), generado con `data/vocab/build_glosses.py` + `curacion_hora_medica.json`; campo `lexiconId` = id UMCE de la foto. **Traducción:** prompts del lab en `translator/prompts.py`; `simplificar` devuelve `simple` + `opciones` (respuestas rápidas); `complejizar` para `cliente_dice`; `espanol_a_glosas` con literales `TEXTO:10:30` para horas, cifras y nombres. `pipeline.py` corre v2 y v4 en paralelo (v4 caído no bloquea v2). **Voz:** mujer `Fd38GRHtJllY0CuguAy9` (defecto) y hombre `6WgXEzo1HGn3i7ilT4Fh`; el atributo `voz` del participante la cambia; RUT, horas y montos se normalizan para el TTS. **Escenario como datos:** `packages/glosses/data/escenarios/hora_medica.json` (descripción, ejemplos, keyterms STT, pronunciaciones), se elige con `ESCENARIO`. **BD del agente:** SQLite (`store.py`, `db/schema.sql`, portable a Supabase) con caché de frases genéricas, latencia por turno y glosas faltantes. **Eval:** `data/eval/v2_casos.json` (36 casos) + `eval_v2.py`.
- Decidí: SQLite local y no Supabase, porque aún no hay proyecto y A es dueño de esa infra. La caché solo guarda frases de una **lista blanca** del escenario (`frases_frecuentes`), nunca texto libre de la llamada, y sin la entrada (solo su hash); glosas faltantes sin nombres y con purga. Contrato aditivo: `ejecutivo_dice.opciones` y glosas `TEXTO:` (**D:** mostrar `TEXTO:` como texto grande y conectar `opciones` a `QuickReplies`; helpers `isLiteralGloss`/`literalText` en `@puente/glosses`).
- Verificado: `pytest` agent (41) y api (7), `pnpm typecheck` y `pnpm build` OK. **No probado con claves reales** (sin `.env` en esta sesión): falta correr `uv run python eval_v2.py`, que además precalienta la caché, escuchar las 2 voces y medir la latencia real.
- Falta / bloqueado: **A:** que `/token` permita el atributo `voz` del cliente y `AGENT_DB_PATH=/tmp/puente.db` en el contenedor (el usuario `puente` no escribe en `/app`; sin eso el agente corre sin caché). Validar las glosas con una persona señante. STT a 8 kHz sin medir (B3).

## 2026-11-21 — Claude (docs/convencion-ramas)
- Hice: convención de nombres de rama en `PLAN-TRABAJO.md` §2 (también en ONBOARDING §5–6, PRACTICAS y CLAUDE.md). En PR aparte (`chore/ignorar-worktrees`), `.gitignore` también ignora `.worktrees/` y `worktrees/`.
- Decidí: una rama corta por PR `<prefijo>/<tema>` con prefijos `v1/`–`v4/`, `docs/`, `chore/` y `fix/`. **`dev` es la rama de integración**: las ramas salen de `dev` y los PRs van a `dev`; `main` solo recibe `dev` estable. Se prohíbe `worktree-*`.
- Falta: que cada dueño renombre sus ramas abiertas que no siguen la convención (`worktree-adrs-arquitectura`, `worktree-skills-hackaton`, `ui-design-system`, `lab-v1-v2`, `roles-martin-tomas`), o que las borre si ya están mergeadas.

## 2026-11-21 — Martín / Claude (v1-telefonia)
- Decidí: Martín y Tomás intercambian roles: **Martín queda en A (telefonía, deploy, v1)** y **Tomás en C (visión, v3)**. Tabla actualizada en `PLAN-TRABAJO.md`.
- Falta / bloqueado: acordar si el deploy sigue saliendo del repo personal de Tomás o pasa a Martín, y quién es dueño de las cuentas de LiveKit y Twilio.
## 2026-11-21 — Tomás / Claude (lab-v1-v2)
- Hice: simulación de llamada en el navegador (sin Twilio): `app/backend/main.py` (FastAPI + WebSocket) con páginas `/ejecutivo` (micrófono → Scribe) y `/cliente` (chat). Checkbox v2 activa simplificar/naturalizar. Probado de punta a punta por WebSocket: STT ~0,5 s, LLM ~1 s, TTS ~0,6 s. Prompt de "complejizar" afinado (suena normal, sin agregados). Scribe: 7/10 frases perfectas con audio de WhatsApp.
- Decidí: simular al ejecutivo en el navegador hasta decidir el upgrade de Twilio (pide cargar saldo).
- Falta: probar con micrófono real en el navegador, STT en streaming, Twilio real, v3/v4.

## 2026-11-21 — Rafael / Claude (dev)
- Hice: sistema de diseño de Puente. Artefacto con la guía completa (https://claude.ai/artifact/7kbPXxp6kcwGSb3hQV3WVh) y su versión en código en `packages/ui`: tokens (Noche por defecto + Día), logo, 9 íconos y 11 componentes (Logo, Icon, Button, CallStatus, VisualAlert, Subtitles, QuickReplies, Composer, GlossChip, SignCamera, SignAvatar). La app ya importa los estilos; el inicio usa los componentes nuevos, `/design` muestra el catálogo y la PWA tiene ícono.
- Decidí: tipografías Atkinson Hyperlegible (lectura), Bricolage Grotesque (títulos) y JetBrains Mono (glosas). Se mantienen los nombres de variables de `globals.css` (`--bg`, `--fg`, `--muted`, `--accent`, `--cliente`). `Subtitles` y `VisualAlert` siguen aceptando las props de antes.
- Falta / bloqueado: la figura de cámara y avatar es de ejemplo, `TODO(real-data)`. (Typecheck y build verificados después; mergeado en PR #2.)

## 2026-11-21 — Raimundo / Claude (rama worktree-adrs-arquitectura) — ⚠️ requiere acuerdo del equipo antes de merge
- Hice: 11 ADRs + índice en `docs/adr/` y esqueleto de monorepo en 3 commits separados: (a) ADRs, (b) esqueleto **aditivo** (`apps/ packages/ services/ ml/`, CI, Dockerfiles), (c) **movimiento**: borra `app/` y actualiza CLAUDE.md, ONBOARDING (§3 con mapa de rutas viejas→nuevas, §5, §6), plan.md y contrato.md (solo agrega 2 tipos).
- Decidí (propuesto, Raimundo eligió esto): monorepo pnpm+Turborepo / uv; LiveKit (SIP+Twilio para el teléfono) como tiempo real; PWA Next.js export estático + Capacitor; glosas LSCh como formato intermedio; TTS ElevenLabs; reproductor de señas con clips primero (`ClipSignPlayer`) y avatar 3D después.
- Decidí (después): **despliega Raimundo**, desde su repo personal con doble push (antes decía Tomás); ONBOARDING §4, PLAN-TRABAJO y ARQUITECTURA actualizados.
- Verificado: `pnpm typecheck` y `pnpm build` OK; `pytest` api (7) y agent (10) OK. No probado con claves reales ni con Docker.
- Falta / bloqueado: **Tomás y el resto deben aceptar (c) antes de mergear**; (a) y (b) se pueden tomar solos. Quien tenga trabajo abierto en `app/backend` o `app/web` debe rebasar con el mapa del ONBOARDING §3. `/llamadas` (SIP saliente) es stub `TODO(v1)`; `agent.py` no se ha corrido contra LiveKit real; voz chilena (`ELEVENLABS_VOICE_ID`) sin elegir; push bloqueado por permisos en esta sesión.

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

## 2026-11-21 — Flujo de llamada entrante (diseño)
- Hice: diagrama 1.1 con SIP entrante y `call.incoming`; diagrama de secuencia entrante en `docs/ARQUITECTURA.md` §1.3; tabla `phone_numbers`; §1.7 de decisiones para la demo.
- Decidí: inbound trunk + dispatch rule individual (salas `call-*`, agente `inbound-agent`). El agente maneja espera, saludo y buzón, en vez de FastAPI.
- Plan B: si 3 h antes de presentar SIP no conecta, Twilio Media Streams → FastAPI. STT: prueba de 10 min Deepgram vs Scribe. Fuera: Tauri y avatar 3D; agente en LiveKit Cloud.
- Falta: código (`inbound-agent`, `/webhooks/livekit`, `call.incoming` en `contract.ts`, aviso en `apps/web`).
