# Despliegue paso a paso

> Quién despliega: **Raimundo**, desde su repo personal. Contexto y decisiones: [`ARQUITECTURA.md`](ARQUITECTURA.md) §3 y [ADR-0011](adr/0011-despliegue-vercel-y-contenedores.md).
>
> **Estado honesto:** nada de esto se ha ejecutado todavía. No había Docker, ni cuentas ni claves en el equipo donde se escribió.
> Los comandos salen de la documentación oficial (links al final) y de nuestros archivos, pero el primer despliegue
> hay que tratarlo como una prueba. Donde algo es incierto lo digo.

## Resumen: qué se despliega y dónde

| Pieza | Dónde | Por qué |
|---|---|---|
| PWA (`apps/web`) | **Vercel** | Export estático, HTTPS automático (la cámara lo exige) |
| API (`services/api`) | **Fly.io** (región `scl`) | Servicio HTTP en contenedor |
| Agente (`services/agent`) | **Fly.io** (región `scl`) | Proceso de larga duración, sin puerto; no cabe en serverless |
| Salas y SIP | **LiveKit Cloud** | Gestionado |
| Número telefónico | **Twilio** | Solo para la v1 real; la demo puede arrancar sin esto |

Elegí Fly.io para el backend porque tiene región en Santiago y mantiene el agente encendido. Render sirve la API, pero
su agente tendría que ir como *Background Worker* y **tengo entendido que el plan gratuito no los incluye** (verifícalo);
la alternativa para Render está en el §10.

## Orden de los pasos (y por qué)

Hay una dependencia circular: la PWA necesita la URL de la API **al compilarse**, y la API necesita la URL de la PWA
para CORS. Se resuelve así: API → PWA → volver a la API a poner el CORS final.

```
0 Requisitos → 1 Repo personal → 2 LiveKit → 3 API → 4 Agente → 5 PWA → 6 CORS final → 7 Verificar → 8 Telefonía
```

---

## 0. Requisitos

- [ ] Cuentas: GitHub (repo personal), **Vercel**, **Fly.io** (pide tarjeta; revisa los precios vigentes), **LiveKit Cloud**,
  y las claves de **Anthropic**, **Deepgram** y **ElevenLabs**. Twilio solo para el §8.
- [ ] CLI: `flyctl` (`fly`) y, opcional, `lk` (LiveKit CLI) y `vercel`.
- [ ] **Antes de exponer algo a Internet: requerimiento A4** del plan. Hoy `/token` no exige sesión ni tiene límite de tasa,
  así que cualquiera podría gastar tu cuota de Claude y ElevenLabs. Mínimo para la demo: una clave de demo en `/token`
  y límite de tasa. **No publiques la URL fuera del equipo hasta cerrarlo.**
- [ ] Una voz chilena elegida: `ELEVENLABS_VOICE_ID` (ADR-0006). Sin eso el agente usa un valor de relleno.

## 1. Repo personal con doble push

Vercel y Fly no ven el repo de la organización, así que se despliega desde un repo tuyo (README raíz, "Deploying & integrations").

```bash
# 1) Crea un repo vacío en tu cuenta de GitHub, por ejemplo <tu-usuario>/puente (sin README).
# 2) En tu clon, agrega los dos destinos de push:
git remote set-url --add --push origin https://github.com/platanus-hack/platanus-hack-26-cl-team-12.git
git remote set-url --add --push origin https://github.com/<tu-usuario>/puente.git
git remote -v        # deben salir 2 líneas (push) y 1 (fetch)

# 3) Desde ahora, un push actualiza ambos:
git push origin main
```

Regla del equipo: los demás pushean solo a la organización; tú traes (`git pull`) y empujas a ambos.
Nunca `git push --force` a `main`.

> `set-url --add --push` sustituye el comportamiento por defecto: ahora `origin` solo empuja a las URLs que agregaste,
> por eso hay que agregar **las dos**.

## 2. LiveKit Cloud

1. Crea un proyecto en LiveKit Cloud.
2. Copia **URL** (`wss://<proyecto>.livekit.cloud`), **API Key** y **API Secret** (Settings → Keys).
3. Guárdalas en un gestor de contraseñas. Las usarás en los pasos 3, 4 y 8.

## 3. API en Fly.io

Se construye **desde la raíz del repo** (necesita `packages/glosses`). Según la documentación de Fly, al pasar el directorio de
trabajo, `--config` y `--dockerfile` se resuelven relativos a él, por eso todo se ejecuta desde la raíz con `.`.

**3.1** Crea `services/api/fly.toml`:

```toml
app = "puente-api"            # cámbialo: el nombre debe ser único en Fly
primary_region = "scl"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = "off"  # que no "duerma": la demo no puede esperar un arranque en frío
  min_machines_running = 1

  [[http_service.checks]]
    method = "GET"
    path = "/health"
    interval = "15s"
    timeout = "5s"
    grace_period = "10s"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory = "512mb"
```

**3.2** Crea la app, carga los secretos y despliega:

```bash
fly auth login
fly apps create puente-api

fly secrets set --app puente-api \
  LIVEKIT_URL="wss://<proyecto>.livekit.cloud" \
  LIVEKIT_API_KEY="..." \
  LIVEKIT_API_SECRET="..." \
  CORS_ORIGINS="http://localhost:3000" \
  ALLOWED_DESTINATIONS="+56912345678"

fly deploy . --config services/api/fly.toml --dockerfile services/api/Dockerfile
```

**3.3** Comprueba: `curl https://puente-api.fly.dev/health` debe responder `{"ok":true}`.
Anota la URL: la necesitas en el paso 5.

> Los secretos con `fly secrets set` quedan cifrados en Fly y **no** en el repo. `CORS_ORIGINS` se corrige en el paso 6.

## 4. Agente en Fly.io

**4.1** Crea `services/agent/fly.toml` (sin `http_service`: el agente no recibe tráfico HTTP, se conecta él a LiveKit):

```toml
app = "puente-agent"
primary_region = "scl"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory = "1gb"              # el VAD (Silero) y livekit-agents piden más que la API; sube si ves reinicios por memoria
```

**4.2** Secretos y despliegue:

```bash
fly apps create puente-agent

fly secrets set --app puente-agent \
  LIVEKIT_URL="wss://<proyecto>.livekit.cloud" \
  LIVEKIT_API_KEY="..." \
  LIVEKIT_API_SECRET="..." \
  ANTHROPIC_API_KEY="..." \
  DEEPGRAM_API_KEY="..." \
  ELEVENLABS_API_KEY="..." \
  ELEVENLABS_VOICE_ID="Fd38GRHtJllY0CuguAy9" ELEVENLABS_VOICE_ID_HOMBRE="6WgXEzo1HGn3i7ilT4Fh" \
  ESCENARIO=hora_medica AGENT_DB_PATH=/tmp/puente.db

fly deploy . --config services/agent/fly.toml --dockerfile services/agent/Dockerfile
fly logs --app puente-agent
```

**4.3** Comprueba en los logs que el worker **se registra en LiveKit** y queda esperando salas.

> Por defecto un agente se asigna a **cualquier sala nueva del proyecto**. Para el MVP está bien; si compartes el
> proyecto de LiveKit con otras pruebas, ponle un `agent_name` y despacho explícito.

## 5. PWA en Vercel

1. En Vercel: **Add New → Project** → importa **tu repo personal**.
2. **Root Directory: `apps/web`**. Mantén activado *"Include source files outside of the Root Directory in the Build Step"*
   (viene activado): la app importa `packages/glosses`, `signs`, `avatar` y `ui`.
3. Framework: **Next.js** (se detecta solo). Vercel usa pnpm por el `pnpm-lock.yaml` y el campo `packageManager`.
4. Variable de entorno (se hornea en el build estático): `NEXT_PUBLIC_API_URL = https://puente-api.fly.dev`
5. **Deploy**. Anota la URL (`https://<proyecto>.vercel.app`).

Si algo falla:
- *"No Next.js version detected"*: el Root Directory no coincide con la carpeta que tiene el `package.json` de la app (`apps/web`).
- Build correcto pero **404 en el sitio**: la app usa `output: "export"`; si Vercel no toma la salida sola,
  pon **Output Directory = `out`** en Settings → Build & Development. (No lo pude verificar en la documentación.)
- Usó npm en vez de pnpm: pon el Install Command en `pnpm install --frozen-lockfile`.

Cada cambio de `NEXT_PUBLIC_API_URL` exige **volver a desplegar** la PWA.

## 6. CORS final en la API

Ahora que existe la URL de la PWA:

```bash
fly secrets set --app puente-api CORS_ORIGINS="https://<proyecto>.vercel.app"
```

Fly reinicia la app con el valor nuevo. **Nunca uses `*`.**

## 7. Verificación (prueba de humo)

| # | Prueba | Esperado |
|---|---|---|
| 1 | `curl https://puente-api.fly.dev/health` | `{"ok":true}` |
| 2 | `curl -X POST https://puente-api.fly.dev/token` | JSON con `url`, `token`, `room`, `identity` (si da 503: faltan las variables de LiveKit) |
| 3 | `curl https://puente-api.fly.dev/glosses` | El diccionario (12 glosas de ejemplo) |
| 4 | Abrir la PWA en HTTPS | Carga y muestra "Vocabulario LSCh cargado: 12 señas" |
| 5 | Botón **Iniciar llamada** | Se conecta; en los logs del agente aparece que entra a la sala |
| 6 | Desde la consola del navegador de la PWA, un `cliente_dice` | El agente lo valida y se oye la voz de ElevenLabs |
| 7 | Desde otro origen, intentar `POST /token` | El navegador bloquea por CORS |

Los pasos 5 y 6 son los primeros en probar `agent.py` contra servicios reales: espera encontrar errores ahí.

## 8. Telefonía real (v1): Twilio + LiveKit SIP

Es lo que convierte el prototipo en el producto, pero **se puede dejar para después** de que 1 a 7 funcionen. Resumen de la guía
oficial de LiveKit para Twilio:

1. **Twilio:** compra un número y crea un **Elastic SIP Trunk**. Anota la *Termination SIP URI* (el dominio debe terminar en
   `pstn.twilio.com`) y crea una **credential list** asociada al trunk.
2. **Permisos geográficos de voz:** habilita **Chile** en Twilio, o las llamadas a números `+56` serán rechazadas.
   Con cuenta *trial* solo se llama a números verificados.
3. **LiveKit:** crea un *outbound trunk* con la dirección del trunk de Twilio y sus credenciales (por CLI con `lk sip outbound create`
   y un JSON, o desde el panel). Anota su `sip_trunk_id`.
4. Carga `LIVEKIT_SIP_TRUNK_ID`, `TWILIO_*` y `ALLOWED_DESTINATIONS` (solo números de prueba) con `fly secrets set`.
5. Implementa `POST /llamadas` (hoy es un stub con `TODO(v1)`): `CreateSIPParticipant` hacia la sala del cliente, con el número destino.
   Antes, verifica que la sala pertenezca a quien llama (firmar la sala en `/token`, requerimiento A4).

Detalles y ejemplos actuales: la guía de Twilio de LiveKit y la documentación de llamadas salientes (links abajo).

## 9. Después del primer despliegue

- [ ] Actualiza `deploy-url` en `platanus-hack-project.jsonc` con la URL de Vercel.
- [ ] Anota en `docs/BITACORA.md` las URLs y qué se probó.
- [ ] Cambia el estado de las filas de `ARQUITECTURA.md` §0 que ya funcionen.
- [ ] Antes de la demo: haz una llamada de prueba minutos antes, para despertar todo (ver el checklist de `ARQUITECTURA.md` §3.9).

**Despliegues siguientes:** `git push origin main` actualiza **Vercel** solo (despliega al detectar el push). El backend de Fly
no se redespliega solo: repite `fly deploy ...` del paso 3.2 o 4.2.

**Volver atrás:** Vercel → Deployments → *Promote to Production* sobre un despliegue anterior. Fly: `fly releases --app puente-api`
y `fly deploy --image <imagen anterior>`.

## 10. Alternativa: Render en vez de Fly.io

Según la documentación de Render, el *Dockerfile Path* y el *Docker Build Context Directory* se interpretan relativos al
Root Directory del servicio: déjalo **vacío** (raíz del repo) y usa:

| | API | Agente |
|---|---|---|
| Tipo | Web Service (Docker) | **Background Worker** (Docker) |
| Dockerfile Path | `./services/api/Dockerfile` | `./services/agent/Dockerfile` |
| Docker Build Context | `.` | `.` |
| Variables | las del paso 3.2 | las del paso 4.2 |

No encontré un ejemplo oficial que confirme exactamente esta combinación (Dockerfile en subcarpeta + contexto en la raíz);
si el build no encuentra `packages/glosses`, revisa el contexto. Y revisa los precios: un Web Service gratuito se duerme
tras inactividad y los *Background Workers* son de pago.

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| `/token` responde 503 | Faltan `LIVEKIT_URL`, `LIVEKIT_API_KEY` o `LIVEKIT_API_SECRET` en la **API** |
| La PWA llama a `localhost:8000` | `NEXT_PUBLIC_API_URL` no estaba definida al compilar: define y vuelve a desplegar |
| Error de CORS en el navegador | `CORS_ORIGINS` no coincide exactamente con la URL de la PWA (incluye `https://`, sin `/` final) |
| El agente reinicia en bucle | Falta de memoria (sube `memory`) o una variable sin definir: `fly logs --app puente-agent` |
| La llamada se conecta pero nadie habla | El agente no está registrado (revisa sus logs) o falta `DEEPGRAM_API_KEY` / `ELEVENLABS_API_KEY` |
| `COPY packages/glosses/data` falla en el build | Se construyó desde una subcarpeta: hay que ejecutar `fly deploy .` desde la **raíz** |
| Build de Docker enorme o lento | Falta el `.dockerignore` de la raíz (ya está en el repo) |

## Fuentes

- Fly.io: [monorepos](https://fly.io/docs/launch/monorepo/) y [referencia de monorepos](https://fly.io/docs/reference/monorepo/)
- Render: [soporte de monorepos](https://render.com/docs/monorepo-support)
- Vercel: [monorepos](https://vercel.com/docs/monorepos)
- LiveKit: [Twilio](https://docs.livekit.io/telephony/start/providers/twilio/), [trunk saliente](https://docs.livekit.io/telephony/making-calls/outbound-trunk/) y [llamadas salientes](https://docs.livekit.io/sip/outbound-calls/)
