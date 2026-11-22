# Bitácora del equipo
Las entradas nuevas van **arriba**. Formato:

```
## AAAA-MM-DD HH:MM — Nombre (rama)
- Hice: ...
- Decidí: ...
- Falta / bloqueado: ...
```

## 2026-11-21 — r.labbevidal / Claude (chore/simplify) · limpieza de todo el código
- Hice: la API reusa `MAX_TEXTO` (500, del contrato), `recortar`, `normalizar_para_voz`, `DEFAULT_PATH` y los `stt_keyterms` del traductor del agente. Antes eran copias, y el tope era 600. El agente precarga VAD, diccionario y escenario con `prewarm_fnc`. En la web, el contador vive en `EstadoLlamada`, `SignAvatar` perdió props muertos, `SenasFotos` se reinicia con `key` y `Composer` respeta `LIMITES.max_texto`.
- Verificado: ruff, pytest (api 41, agent 63), typecheck, build y 2 archivos de vitest. No probado en el navegador.
- Falta: probar a mano `?mock=1`, con fotos y sin fotos. Lo que se omitió a propósito está en el PR #22 (depende de #21).

## 2026-11-21 — r.labbevidal / Claude (fix/deuda-fase1) · deuda técnica antes de la demo
- Hice: la API (plan C, `/twilio/*`) usa el `Translator` del agente (`services/api/app/traductor.py`) en vez de cargar `lab/v2_simplificar/prompts.py`: una sola fuente de prompts, glosario y escenario. `ejecutivo_dice` ahora trae `opciones`, como pide el contrato. El Dockerfile de la API copia `services/agent/translator` y ya no copia `lab/`.
- Hice: auth mínima (A4). Los POST de Twilio validan `X-Twilio-Signature` (`TWILIO_AUTH_TOKEN`) y el WebSocket `/twilio/cliente` exige `?token=CLIENTE_WS_TOKEN`. Si la variable está vacía no se valida (dev). Las dos quedan en `.env.example` y en `render.yaml`.
- Hice: ruff en CI y `make lint` (dentro de `make check`). Solo hubo que ordenar imports.
- Verificado: `make check` OK (ruff, typecheck, build, pytest api 39 y agent 63). El import del traductor se probó con la estructura de la imagen (sin `lab/`). No probado: `docker build` (no hay Docker en esta máquina) ni una llamada real de Twilio.
- Falta / bloqueado: **en Render, cargar `TWILIO_AUTH_TOKEN` y `CLIENTE_WS_TOKEN`**. Cuando la PWA use `/twilio/cliente`, tiene que mandar el token. Quedan pendientes de la auditoría: test de contrato TS↔Python, `Sala` indexada por CallSid, y sesión y rate limit en `/token`.

## 2026-11-21 — Rafael / Claude (v4/pwa-instalable) · D6 PWA instalable y sin internet
- Hice: íconos PNG (192, 512, maskable y apple-touch) desde el SVG; `manifest.webmanifest` completo (id, start_url `/?mock=1`, portrait, colores, atajo "Pedir una ambulancia" con `?llamar=urgencias`); `public/sw.js` que guarda la app, los JS/CSS de Next, los íconos y las fotos de señas, con la portada primero desde la red y los estáticos primero desde la copia (nunca guarda la API ni LiveKit); registro del SW solo en producción; botón "Instalar app" con `beforeinstallprompt` (Chrome y Samsung Internet); metadatos para iPhone. Script `pnpm --filter @puente/web preview` (build + servidor en :3001).
- Verificado en Edge (CDP, 390×844): manifest sin errores, **instalable sin errores**, SW activo, 126 archivos guardados y **la llamada simulada completa funciona sin internet** (con fotos de señas).
- Decidí: la app instalada abre en `?mock=1` (no hay backend desplegado). TODO(real-data): cambiar `start_url` a `/` cuando la llamada real esté desplegada.
- **Probado en el Samsung Galaxy A33 5G de Rafael:** se instala, abre a pantalla completa y la llamada simulada funciona en modo avión. Cómo: platform-tools de Android, `adb devices` (acá sí aparece el aviso de permiso; con edge://inspect no aparecía) y `adb reverse tcp:3001 tcp:3001`, luego Chrome en `localhost:3001/?mock=1`.
- Falta: probar en iPhone. Capacitor solo si sobra tiempo.

## 2026-11-21 — Raimundo / Claude (fix/bugs-senas-deletreo)
- Hice: arreglé 3 bugs que salieron en la revisión de los tests (#17). `@puente/avatar`: `stop()` dejaba `play()` colgado para siempre (pausar un `<video>` no emite `ended`) y un `play()` encima de otro mezclaba clips; ahora cada `play()` tiene generación y las esperas se cancelan. `@puente/signs`: una confianza de exactamente `MIN_CONFIDENCE` se rechazaba por el redondeo de `Float32Array`; ahora se compara con `Math.fround`.
- Decidí: PR apilado sobre `chore/tests-ci` (necesita Vitest). El deletreo en TS ya estaba arreglado en `dev`.
- Verificado: tests nuevos fallaban antes del arreglo y pasan después; `pnpm typecheck` OK.

## 2026-11-21 18:20 — Raimundo / Claude (rama chore/tests-ci)
- Hice: tests para todas las secciones. JS con Vitest (config única en la raíz, `pnpm test`): `glosses` (contrato `parseMensaje` + integridad del diccionario vs schema), `signs` (reconocedor), `avatar` (`ClipSignPlayer`), `ui` (render accesible), `apps/web` (`joinCall` con LiveKit simulado, incluye anti suplantación `SOLO_AGENTE`). Python: `services/api/tests/test_api_extra.py` (CORS, TTL, E.164, allowlist) y `services/agent/tests/test_agent.py` + `test_glossary.py` (cableado de `agent.py` sin red). CI corre `pnpm test` en el job `web`.
- Decidí: tests en `<paquete>/test/` (fuera de `src`, no afectan typecheck ni build). Para `ui` se usa `react-dom/server`, sin jsdom.
- Verificado: 39 tests JS, 24 api, 24 agent, todos OK localmente.

## 2026-11-21 — Raimundo / Claude (chore/deploy-render) · infra Render + CD + APK
- Hice: `render.yaml` (Blueprint: `puente-api` web Docker, `puente-agent` worker Docker, `puente-web` static, región ohio, secretos `sync: false`). `.github/workflows/cd.yml`: tras CI verde en `main` llama los Deploy Hooks de Render con el commit exacto, espera `/health` y compila la APK de debug (Capacitor) como Release. Proyecto Android versionado en `apps/mobile/android/` con permisos de cámara y micrófono.
- Decidí: hosting en **Render** (antes Vercel + Fly). Auto-deploy de Render apagado: despliega solo el CD. El CD solo despliega en el espejo `rlabbev/puente` (Render no ve la org). Sin TestFlight: en iPhone, la PWA. `CORS_ORIGINS` incluye `https://localhost` (WebView de Android).
- Falta: crear el espejo y el Blueprint en Render, cargar los 3 `RENDER_DEPLOY_HOOK_*` (pasos en `docs/DESPLIEGUE.md`). A4 sigue abierto: no compartir las URLs. El agente es plan starter (pago).

## 2026-11-21 — Rafael / Claude (v4/reproductor-senas) · D5 con fotos del diccionario
- Hice: `apps/web/scripts/extraer_senas.py` saca del Diccionario LSCh (los 2 PDF + `indice_LSCh.csv`) las fotos de cada seña del vocabulario (81 de hora médica) + las del guion de urgencia (AMBULANCIA, HIJO, SANGRE, RESPIRAR, PÁLIDO, FRÍO, URGENTE…): 91 señas, ~120 fotos, ~1 MB, en `apps/web/public/senas/` con `manifest.json`. Elige la variante numerada según `lexiconId` (gracias-1, poder-2). Reproductor `SenasFotos` en la ventana del intérprete: alterna las 2 o 3 fotos de cada seña (750 ms por foto, 250 ms entre señas), `TEXTO:` y glosas sin foto como palabra grande, y deja una franja para el subtítulo para no tapar las manos. Sin fotos en el computador, sigue el intérprete dibujado.
- Decidí: las fotos **no se versionan** (derechos UMCE): `apps/web/public/senas/` en `.gitignore`; cada uno las genera con el script (necesita PyMuPDF y los PDF).
- Falta: sin seña en el diccionario: YO, TÚ, ESPERAR, BRAZO, CODO, MOVER (y TOS, MAÑANA-AM, BUENO no se encontraron por formato). **Decidir con el equipo si el deploy público puede llevar las fotos** (derechos UMCE); si no, la demo desplegada muestra el intérprete dibujado. El agente real tiene que emitir estas glosas (pedir a B el escenario `urgencia`).

## 2026-11-21 — Rafael / Claude (v4-avatar) · guion de la demo y look de app nativa
- Decidí (Rafael): guion fijo de la demo, caída de un niño con el codo quebrado (habla primero la persona sorda). Mientras el otro lado responde no se muestran respuestas rápidas.
- Hice: simulador con ese guion (frase inicial lista para tocar al contestar, una respuesta del guion por turno, "Repita" repite, termina sola). Indicador "Urgencias está respondiendo". Intérprete dibujado como videollamada (ropa oscura y fondo liso, manos que se mueven al hacer señas, subtítulo encima). Look de app nativa: tipografía del sistema (San Francisco/Roboto), título grande, botón rojo de urgencia, lista agrupada, barra de pestañas (Historial y Perfil sin contenido todavía), burbujas de mensajería, caja de texto redonda con botón de enviar, Colgar redondo. Sin el indicador "N" de Next en desarrollo. Revisado con capturas automáticas en tamaño iPhone.
- Falta: frases del guion > 40 caracteres (el agente real limita `opciones` a 40; pedir a B). Vocabulario de urgencias (hijo, sangre, brazo, ambulancia no tienen seña). Intérprete real = fotos/clips (D5).

## 2026-11-21 — Rafael / Claude (v4-avatar) · demo de urgencia
- Decidí (Rafael): **la demo se enfoca solo en la persona sorda llamando a urgencias de la clínica para pedir una ambulancia**. La llamada entrante queda guardada (`IncomingCall` sigue en `packages/ui`) pero fuera del flujo.
- Hice: inicio con un solo botón grande "Pedir una ambulancia". Pantalla de llamada que cabe entera sin bajar: arriba quién, estado y Colgar; el avatar siempre visible con lo último que dijeron encima; el chat baja solo; abajo, fijas, las respuestas rápidas y la caja para escribir. Las respuestas rápidas usan `ejecutivo_dice.opciones` cuando vienen (si no, Sí/No/Repita/Más lento). Quité las glosas bajo el avatar. Simulador con guion de urgencia (emergencia, dirección, si respira, ambulancia en 10 min, instrucciones); "Repita, por favor" repite la última frase. Mergeé `dev` (v2 de Raimundo).
- Falta: mostrar `TEXTO:` en grande cuando llegue el reproductor real (D5). Pedir a B un escenario `urgencia` (vocabulario y frases); hoy el agente está armado para hora médica.
## 2026-11-21 — Raimundo / Claude (v1/swagger-api)
- Hice: Swagger de la API solo para desarrollo: http://localhost:8000/docs (ReDoc en `/redoc`). Endpoints con tags, resúmenes, modelos de respuesta (`/glosses`, `/health`), ejemplos y errores 403/422/501/503 documentados.
- Decidí: `API_ENV=development|production` (defecto development) y `API_DOCS=1|0` para forzar. **El Dockerfile de la API fija `API_ENV=production`**, así el despliegue no expone el mapa de la API aunque nadie lo configure.
- Verificado: `pytest` api (10), incluidos tests de Swagger encendido y apagado.

## 2026-11-21 — Raimundo / Claude (v2/revision-clean-code)
- Hice: revisión de alertas (GitHub, `pnpm audit`, `pip-audit`, ruff, pytest) y de clean code de todo el repo. Informe con pendientes **por dueño** en `docs/REVISION-CODIGO.md`. Arreglé lo de v2: límites del contrato en `packages/glosses/data/contrato.json` (fuente única web + agente), `fingerspell`/`isLiteralGloss` TS alineados con Python, recorte de textos al contrato, respaldo cuando falla Claude en el turno del cliente, `.env` local respetado, `.env.example` sin duplicadas.
- Decidí: no tocar carpetas de otros; los hallazgos quedan en el informe.
- Verificado: `pytest` agent (45), `pnpm typecheck`, `pnpm build`, ruff limpio en `services/agent`.
- Falta / bloqueado: con el PR #7 ya mergeado, a **D** le quedan 2 pendientes altos: `play()` del reproductor se puede colgar y falta el listener de `Disconnected`. Ver el informe.

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
- Hice: **v1 + v2 funcionando de punta a punta con llamada real (gratis, trial de Twilio)**. El celular del ejecutivo habla → Twilio transcribe (`<Gather speech>` con pistas "RUT, Fonasa…") → Claude simplifica → aparece en el chat del cliente; el cliente escribe → Claude complejiza → Twilio se lo dice (`<Say>`). Código: `services/api/app/twilio_media.py` y `app/llamada.py`.
- Para el resto: **Rafael**, la PWA se conecta al WebSocket `/twilio/cliente` con los mensajes de `docs/contrato.md` (`ejecutivo_dice`, `cliente_dice`, `estado`); hay un chat de ejemplo en `/twilio/prueba`. **Raimundo**, uso tus prompts de `lab/v2_simplificar/prompts.py` tal cual (cárgalos de ahí o avísame si se mueven).
- Falta: A2 (botón "Llamar" en la app, hoy se lanza a mano), deploy (A3), seguridad (A4: firma de Twilio, token en `/twilio/cliente`, tope de costo). Una sola llamada a la vez.

## 2026-11-21 — Martín / Claude (v1-telefonia)
- Probé en el trial de Twilio: ❌ SIP hacia LiveKit (trunk y `<Dial><Sip>`), ❌ Media Streams (`<Connect>` y `<Start><Stream>`: Twilio nunca abre el WebSocket). ✅ `<Say>` y ✅ `<Gather input="speech">`.
- Hice: **plan C gratis, funcionando con llamada real a un celular**: Twilio transcribe al ejecutivo → `POST /twilio/turno` recibe el texto → respondemos con `<Say>`. Código en `services/api/app/twilio_media.py`, probado con ngrok.
- Falta: conectar `/twilio/turno` con el traductor (Claude) y la PWA; decir la respuesta del cliente. Es por turnos (tipo walkie-talkie) y con la voz de Twilio, no ElevenLabs. Si se paga el upgrade, se vuelve al plan original con LiveKit (trunk `ST_ND4YzQ9nquNA` ya creado).

## 2026-11-21 — Martín / Claude (v1-telefonia)
- Hice: cuentas de LiveKit Cloud (proyecto "Platanus") y Twilio (trial, número +1 737). Claves verificadas contra ambas APIs.
- Decidí: probar v1 gratis. Twilio llama al celular y lo conecta por `<Dial><Sip>` al SIP URI de LiveKit, sin Elastic SIP Trunking.
- Falta / bloqueado: **TODO(Martín): decidir si vale la pena pagar el upgrade de Twilio (~20 USD)**. El trial bloquea Elastic SIP Trunking (error 20003), pone un aviso de "trial account" al contestar y solo llama a 5 números verificados de Chile. Pagar solo cuando v1 funcione de punta a punta con el desvío gratis.

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
