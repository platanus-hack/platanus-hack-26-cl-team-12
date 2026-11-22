# Traspaso v4 (avatar que firma) — para continuar en otro chat

Escrito el 2026-11-21. Lee primero `docs/V4-AVATAR.md` (cómo funciona y por qué) y `docs/GUION-GRABACION.md` (qué falta grabar).

## Dónde estoy parado
- Carpeta de trabajo (git worktree): `/Users/tomasnusser/Documents/Hackaton/v4-avatar`, rama **`feature/v4-senas`** (desde `dev` local).
- `dev` local ya tiene todo lo hecho hasta ahora (merge `086d57a`). **Nada está subido a GitHub.** Tomás pidió trabajar en local (sandbox) y no tocar el repo del equipo hasta tener algo estable; solo hacer push/PR si lo pide explícitamente.
- La carpeta `/Users/tomasnusser/Documents/Hackaton/platanus-hack-26-cl-team-12` la usa **otra sesión** (rama `v3-vision`). No cambiar ramas ahí; por eso existe el worktree `v4-avatar`. `puente-lab` es otra copia vieja (`lab-v1-v2`).
- Flujo de ramas acordado: `feature/*` → `dev` → `main` (skills de Rai en `Hackaton/hackaton_test/.claude/skills`, `pr-hackaton`). En GitHub ya existe un `origin/dev` que subió alguien del equipo: no está integrado con el `dev` local.

## Cómo levantar todo
```bash
cd /Users/tomasnusser/Documents/Hackaton/v4-avatar
python3 lab/v4_avatar/live/server.py          # http://localhost:8765
```
Páginas: `/` (avatar en vivo + grabar señas + biblioteca), `/chain.html` (encadenar glosas), `/compare.html?v=HOLA__1` (MediaPipe vs WiLoR),
`/bake.html?v=A__1,A__2` (toma → animación del avatar; **dejar abierta hasta "LISTO"**).
- El modelo `lab/v4_avatar/live/models/avatar.vrm` no está en git: si falta, comando en `lab/v4_avatar/live/README.md`.
- `data/signs/img` es un **symlink** a las fotos del diccionario que viven en la carpeta de la otra sesión (gitignored, derechos UMCE).

## Procesar señas nuevas (receta completa)
1. En `/` elegir la glosa → **🎥 Grabar VIDEO crudo** ×3 → `data/signs/video/GLOSA__1..3.webm`.
2. WiLoR por toma (tarda ~1 min c/u, recarga el modelo cada vez):
   ```bash
   cd /Users/tomasnusser/Documents/Hackaton/_tools/WiLoR
   env -u VIRTUAL_ENV PYTORCH_ENABLE_MPS_FALLBACK=1 /Users/tomasnusser/miniconda3/envs/wilor/bin/python \
     /Users/tomasnusser/Documents/Hackaton/v4-avatar/ml/wilor_extract.py \
     /Users/tomasnusser/Documents/Hackaton/v4-avatar/data/signs/video/GLOSA__1.webm \
     --out /Users/tomasnusser/Documents/Hackaton/v4-avatar/data/signs/wilor/GLOSA__1
   ```
   (hacer un loop por toma; hay que correrlo en segundo plano). **Siempre** `env -u VIRTUAL_ENV` y la ruta explícita del Python del env `wilor`: `conda run` cae en el `.venv` equivocado.
3. Abrir `/bake.html?v=GLOSA__1,GLOSA__2,GLOSA__3` y esperar "LISTO" → `data/signs/baked/*.json`.
4. `python3 ml/fuse_takes.py GLOSA` → `data/signs/anim/GLOSA.json` (se versiona). Si una glosa tiene una toma mala: `--takes 2 3`.
5. `/chain.html` para probar encadenado; `python3 ml/chain_sim.py` mide la fluidez con todas las animaciones.
- El nombre de glosa en archivos es el `id` en mayúsculas (`GRACIAS-1`, `ENFERMO-A`), no la glosa con tildes. `chain.html` resuelve `GRACIAS` → `GRACIAS-1`.

## Estado de los datos
- Fusionadas (8): HOLA, GRACIAS-1, SI, NO, PERMISO, MEDICO, ENFERMO-A, FIEBRE. Faltan ~71 de la lista de 79 + alfabeto manual + números (ver guion).
- Las grabó Tomás sin ser señante: **validar con una persona señante de LSCh**.

## Pendientes, en orden
1. Tomás conseguirá el guion preciso (qué palabras y frases). Ampliar `docs/GUION-GRABACION.md` y el escenario con eso.
2. Grabar y procesar las glosas nuevas (receta arriba). Idealmente también **frases completas** (mejoran las transiciones).
3. **Conectar con el flujo de la llamada**: frase del ejecutivo → Haiku → secuencia de glosas (ya hay `POST /api/glosas` en `lab/sim_llamada`) → `chain.html`/reproductor. Hoy `chain.html` recibe las glosas a mano.
4. Correr `lab/v4_avatar/describe_senas.py` para generar descripciones escritas de cada seña con visión de Claude. Necesita la clave de Anthropic: lo corre **Tomás**: `ENV_FILE=/ruta/.env python3 lab/v4_avatar/describe_senas.py` (Claude no tiene acceso al `.env`; el permiso se deniega, no insistir).
5. Limpiar el `.venv` de `/Users/tomasnusser/Documents/Hackaton/.venv`: por un error de `conda run` se instalaron ahí torch, ultralytics, numpy<2, etc. Se lo ofrecí a Tomás y no ha respondido.
6. Mejoras posibles: más fluidez ("máxima" 0,6 s), pulgar con WiLoR, abducción de dedos, cara del avatar, unificar `index.html` con `rig.js` (hoy duplican retargeting).

## Ojo con (aprendido a la mala)
- Permisos: la lectura/edición de `.env` está bloqueada; `.env.example` no se puede editar con Edit. En macOS `sed -i` necesita `''`.
- `rig.js` mide la geometría real del avatar para asignar brazo derecho a la derecha de la pantalla (la pantalla va en espejo por CSS `scaleX(-1)`). No volver a suponer hacia dónde mira el avatar.
- WiLoR en Mac: no existe EGL, por eso `wilor_extract.py` stubea el renderer; MPS no soporta float64; el detector necesita `weights_only=False` (solo para ese archivo oficial) y `dill`.
- Licencias: WiLoR y MANO son no comerciales: **no** subir `_tools/`, `MANO_RIGHT.pkl`, videos ni salidas de WiLoR al repo.
- Tomás es chileno: español chileno con tuteo, sin voseo. Respuestas cortas. Ver `CLAUDE.md`.
