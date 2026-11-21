# Onboarding para Claudes y humanos del equipo

> Léelo completo antes de tocar nada. Después lee `docs/PRACTICAS-MULTI-CLAUDE.md` y las últimas entradas de `docs/BITACORA.md`.

## 1. Qué estamos haciendo
**Puente**: permite que personas sordas hagan llamadas telefónicas a servicios que solo atienden por teléfono (banco, reserva de horas médicas, servicios del Estado).
- **Cliente** = persona sorda (usa la app en su celular).
- **Ejecutivo** = persona al otro lado del teléfono (no usa nada especial, solo llama).

Hackatón Platanus 26, track Physical World. Equipo de 4: Martín Rosenfeld, Tomás Nusser, Rafael Rencoret, Raimundo Labbé. Lo que importa es una **demo funcionando**, no código perfecto.

## 2. Las 4 versiones (incrementales: cada una incluye la anterior)
1. **v1** — El ejecutivo llama; el cliente ve en la app la voz convertida a texto. El cliente escribe y la app "habla" por teléfono (TTS).
2. **v2** — v1 + LLM que **simplifica** lo que dice el ejecutivo (palabras simples y concisas, porque muchas personas sordas tienen vocabulario escrito más reducido: el español es su segunda lengua) y **complejiza** lo que escribe el cliente para que suene natural al ejecutivo.
3. **v3** — v2 + el cliente **firma frente a la cámara** del celular (lengua de señas chilena, LSCh); la app lo reconoce, lo complejiza y lo dice por voz. Vocabulario acotado al escenario de demo.
4. **v4** — La voz del ejecutivo se convierte en un **avatar de lengua de señas** y el cliente responde firmando.

Decisiones ya tomadas:
- Un **único escenario de demo** (reserva de hora médica o banco; por definir) para acotar vocabulario en v3/v4.
- La app del cliente es una **PWA** (Next.js, instalable en el celular). Sin app nativa. Necesita HTTPS (la cámara no funciona sin él).
- Decir "personas sordas", no "sordomudos", en pitch y textos.
- v3 y v4 son las partes de riesgo alto: se prometen solo con vocabulario cerrado.

## 3. Estructura del repo
```
apps/web          Next.js PWA del cliente (export estático)
apps/mobile       Capacitor: envuelve apps/web para Android/iOS
apps/desktop      Tauri (opcional)
packages/glosses  diccionario de glosas LSCh + tipos del contrato (fuente única de verdad)
packages/signs    MediaPipe + clasificador ONNX (v3)
packages/avatar   reproductor de señas: clips primero, avatar 3D después (v4)
packages/ui       componentes accesibles compartidos
services/api      FastAPI: tokens de LiveKit, /llamadas (Twilio SIP), /glosses
services/agent    LiveKit Agents: STT (Deepgram) + traductor Claude + TTS (ElevenLabs)
ml/training       entrenamiento del clasificador de señas
data/             investigación, vocabulario, clips/datasets de señas, evaluación (NO se despliega)
docs/             plan, contrato de mensajes, bitácora, prácticas, adr/ (decisiones de arquitectura)
```
Regla: `apps/`, `packages/` y `services/` nunca leen de `data/research` ni de `docs`. Contrato de mensajes entre piezas: `docs/contrato.md`.
Las decisiones técnicas y sus alternativas están en `docs/adr/`.

**Mapa de rutas viejas → nuevas** (el scaffold anterior `app/` ya no existe):
| Antes | Ahora |
|---|---|
| `app/backend/main.py` | `services/api/app/main.py` |
| `app/backend/requirements.txt` | `services/api/pyproject.toml` (uv) |
| `app/backend/telefonia` | `services/agent/telefonia` + `/llamadas` en `services/api` |
| `app/backend/llm` | `services/agent/translator` |
| `app/web` | `apps/web` |
| `app/web/camara` | `packages/signs` (+ `ml/training`) |
| `app/web/avatar` | `packages/avatar` |

## 4. Repos y cómo se hacen los pushes
Hay **dos repos con el mismo código**:
- **Organización (oficial, lo que ve el jurado):** `platanus-hack/platanus-hack-26-cl-team-12`
- **Personal de Raimundo (desde aquí se despliega):** `<usuario>/<repo>` (por crear; pasos en el README raíz, sección "Deploying & integrations")

Por qué: Vercel/Render no pueden conectarse a repos de la organización, solo a repos propios.

**Reglas:**
- **Todos** hacen push solo al repo de la **organización** (`origin` normal). No configuren doble push ni creen repos personales.
- **Raimundo** es el único que despliega: trae lo de la organización (`git pull`) y hace `git push` a ambos (su `origin` tiene doble push configurado). Así los dos repos quedan iguales.
- Nunca `git push --force` a `main`. Nunca commitear `.env` ni claves.

## 5. Qué hacer para meterte al git con Tomás (pasos para cada compañero)
1. Instalar `gh` y loguearte con **tu** cuenta de GitHub: `gh auth login` (GitHub.com → HTTPS → Yes → navegador). Verifica con `gh auth status`.
2. Confirmar acceso de escritura al repo de la organización: `gh repo view platanus-hack/platanus-hack-26-cl-team-12 --json viewerPermission -q .viewerPermission` debe decir `WRITE` (o `ADMIN`). Si dice `READ`, pídele a Tomás que revise que estás en el equipo.
3. Clonar: `gh repo clone platanus-hack/platanus-hack-26-cl-team-12` y abrir **esa carpeta raíz** en VSCode.
4. Crear tu `.env` local desde `.env.example` (pídele las claves a Tomás por un canal privado; nunca por el repo).
5. **Atajo:** `make setup` y luego `make dev` (todos los comandos con `make help`; `make doctor` revisa las herramientas). A mano: `pnpm install` (JS) y `uv sync` dentro de `services/api` y `services/agent` (Python, crea su `.venv`). Levantar: `pnpm --filter @puente/web dev`, `uv --directory services/api run uvicorn app.main:app --reload` y `uv --directory services/agent run python agent.py dev`. Verificar: `pnpm typecheck && pnpm build` y `uv --directory services/<api|agent> run pytest`.
6. Crear tu rama de vertical (ver abajo), trabajar, hacer commits pequeños y subir con `git push -u origin <rama>`.
7. Abrir PR a `main` (`gh pr create`) con descripción corta. Avisar al equipo. Tomás o quien revise lo mergea.
8. Anotar en `docs/BITACORA.md` lo que hiciste (ver formato en ese archivo).

## 6. Ramas y reparto (una vertical por persona)
| Rama | Qué | Carpeta |
|---|---|---|
| `v1-telefonia` | Twilio + LiveKit SIP + STT/TTS | `services/agent/telefonia`, `services/api` |
| `v2-llm` | simplificar / complejizar | `services/agent/translator` |
| `v3-vision` | MediaPipe + clasificador de señas | `packages/signs`, `ml/training` |
| `v4-avatar` | avatar/clips + frontend | `packages/avatar`, `apps/web` |

Cada quien toca su carpeta para evitar conflictos. Si necesitas tocar un archivo compartido (`main.py`, `package.json`, `docs/contrato.md`), avisa en la bitácora y haz el cambio en un commit aparte y pequeño.

## 7. Otras cosas que deben saber
- Respuestas de Claude en **español chileno** (tuteo, sin voseo ni "che").
- MVP primero: si una fuente real bloquea, mockea/hardcodea y deja `TODO(real-data)`.
- Commits pequeños y frecuentes con mensajes claros.
- Python en `.venv`; secretos solo en `.env`.
- Antes del cierre hay que llenar `platanus-hack-project.jsonc`, `project-description.md` y poner un logo 1000x1000 (máx. 500kb). Pendiente: nombre final del proyecto.
