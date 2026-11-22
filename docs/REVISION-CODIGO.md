# Revisión de alertas y clean code — 2026-11-21

Revisión de todo el repo: alertas de seguridad, dependencias, linters y clean code (Python y TypeScript).
Lo que es de v2 ya quedó arreglado en la rama `v2/revision-clean-code`. **Lo pendiente está agrupado por dueño.**
Marca con ✅ lo que arregles.

## 1. Alertas
| Fuente | Resultado |
|---|---|
| GitHub Dependabot | Sin alertas |
| GitHub code scanning / secret scanning | No están activados (404). Recomendado: activar secret scanning en el repo |
| CI (PRs #10 y #12) | Verde: web, python (api), python (agent), dockerfiles |
| `pip-audit` services/api y services/agent | 0 vulnerabilidades |
| `pnpm audit` | 18 (1 crítica, 10 altas, 7 moderadas). **Ninguna en código desplegado**: ver abajo |
| pytest | 1 aviso: `starlette.testclient` con `httpx` está obsoleto (sin impacto) |
| ruff (`services/`) | Limpio salvo el orden de imports de `services/api/tests/test_api.py` |

**Dependencias JS (todas de build):**
- `tar`, `glob`, `minimatch`: vienen de `@capacitor/cli@6` (`apps/mobile`). Se resuelven subiendo a Capacitor 7. Es lo primero del plan de recorte, así que bajo riesgo para la demo.
- `postcss@8.4.31`: fijado por `next@15.5.29` (`apps/web`); solo actúa al compilar CSS propio. Se resuelve con un `pnpm.overrides` de `postcss` a `^8.5.23` en el `package.json` raíz, o subiendo Next.

## 2. Ya arreglado (v2, `v2/revision-clean-code`)
- Límites del contrato en **`packages/glosses/data/contrato.json`**, leído por web y agente. Antes estaban copiados en 4 archivos y ya se habían desfasado.
- `fingerspell` e `isLiteralGloss` en TS validan igual que el agente (solo letras, máx. 20; `TEXTO:` con regex estricta).
- El agente recorta `texto`/`simple`/`subtitulo` a `max_texto`: antes la web descartaba el mensaje entero sin aviso.
- `turno_cliente` con respaldo si Claude falla; la BD ya no puede botar un turno; `create_task` con referencia.
- `TRANSLATOR_MODEL` y los TTL ya respetan el `.env` local (antes se leían antes de `load_dotenv`).
- `.env.example`: se quitaron 4 variables duplicadas. El `ELEVENLABS_VOICE_ID=` vacío pisaba la voz chilena.
- Swagger (PR #12): `API_DOCS=` vacío ya no lo apaga.

## 3. Pendiente por dueño

### D — Rafael (`apps/web`, `packages/ui`, `packages/avatar`)
> Actualizado tras mergear el PR #7 (pantalla de llamada): lo marcado con ✅ ya quedó resuelto en `dev`.

**Alta (afectan la demo):**
1. ✅ (PR #7: `CallPanel` con `Composer`, `QuickReplies` con `opciones` y `SignAvatar`) `apps/web/src/app/page.tsx:18-26`: `onMessage` ignora `opciones`, `glosas_para_senar` y no hay `Composer`, así que **el cliente no puede responder** ni ver las señas. Conectar `QuickReplies` (con `opciones` o Sí/No por defecto) y `SignAvatar`.
2. `packages/avatar/src/index.ts:30-40`: el reproductor salta en silencio `TEXTO:` y `DACTILOLOGÍA:`, así que las horas y el RUT no se ven. Usar `isLiteralGloss`/`literalText` y mostrar el dato en grande.
3. `packages/avatar/src/index.ts:35-46`: `play()` se puede colgar para siempre: `stop()` no dispara `ended`, un clip 404 dispara `error` y el autoplay bloqueado en iOS rechaza la promesa. Resolver con `ended`, `error` y abort.
4. ✅ (PR #7: `CallPanel` convierte `TEXTO:` al dato antes de pasarlo) `packages/ui/src/components/SignAvatar.tsx:22-24`: muestra "TEXTO:10:30" tal cual como chip.
5. Parcial (PR #7 limpia al desmontar; **falta** el listener de `Disconnected`) `apps/web/src/lib/call.ts:20-42`: si se cae la conexión, el estado queda en "En llamada" para siempre.

**Media:**
6. ✅ (PR #7: el inicio se oculta mientras conecta) `page.tsx:47`: "Llamar" sigue habilitado mientras conecta; un doble toque crea dos salas.
7. ✅ (PR #7) `page.tsx:20`: `crypto.randomUUID()` falla sin HTTPS (al probar en el celular por `http://192.168…`).
8. `call.ts:6`: el fallback `http://localhost:8000` queda horneado en el build estático; si falta `NEXT_PUBLIC_API_URL` en Vercel, la app apunta a localhost.
9. ✅ (PR #7) `packages/ui/src/styles/components.css:57`: falta `white-space: pre-line` en `.pu-sub`. `simple` viene en líneas cortas y se ve todo junto.
10. `Subtitles.tsx:16`: falta auto-scroll a la última línea; en llamadas largas el subtítulo nuevo queda fuera de la vista.
11. ✅ (PR #7: alertas `{message, tone}` y aviso al colgar) `page.tsx:41`: el tono de la alerta se deduce con `startsWith("No se pudo")`; al colgar no hay aviso.

**Baja:** el color `#0b1220` se repite en 4 lugares; el manifest no tiene íconos PNG de 192/512 (Android no ofrece instalar); dependencias `@puente/avatar`/`@puente/signs` sin usar en web; varias live regions anuncian a la vez; falta el guard de `isComposing` en el Enter de `Composer`.

### A — Martín (`services/api`, deploy)
1. `/token`: permitir el atributo `voz` (`mujer`/`hombre`) del cliente (lo usa el agente).
2. Contenedor del agente: `AGENT_DB_PATH=/tmp/puente.db` (el usuario `puente` no escribe en `/app`).
3. `services/api/tests/test_api.py`: orden de imports (ruff I001). Trivial.
4. `REPO_ROOT`, la ruta de `glosses.json` y `ROL_CLIENTE = "cliente"` están duplicados entre `services/api` y `services/agent`. Se podría mover el rol a `contrato.json`.

### Lab (Tomás)
- `lab/sim_llamada` usa un contrato propio (`glosas` dentro de `ejecutivo_dice`, `enviado`, `transcripcion`) y prompts copiados del agente. Conviene que importe `translator` o marcarlo como congelado.
- El lab usa `MODELO_LLM`/`ELEVENLABS_TTS_MODEL` y el agente `TRANSLATOR_MODEL`/`ELEVENLABS_MODEL`: unificar los nombres.

### v2 — Raimundo (deuda menor, sin urgencia)
- `cache_hit` se calcula con un contador compartido; con turnos cruzados se puede atribuir mal (es solo métrica).
- Tres nombres para la tarea de glosas (`espanol_a_glosas`, `glosas`, lado `ejecutivo`): unificar en `prompts.TAREAS`.
