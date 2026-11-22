# v4 — Avatar que firma (voz → señas): cómo funciona y qué decidimos

Estado a 2026-11-21. Todo vive en `lab/v4_avatar/` y `ml/` (sandbox, no se despliega).

## Idea en una línea
Grabamos cada seña **varias veces con la webcam**, las procesamos offline con modelos precisos, las **fusionamos** en una animación limpia por glosa
y, en la llamada, el avatar **encadena** esas animaciones con transiciones solapadas. Nadie señea en vivo.

## Pipeline
1. **Grabar** (`lab/v4_avatar/live/`, `python3 lab/v4_avatar/live/server.py` → http://localhost:8765).
   Panel con foto del diccionario, descripción (si existe), enlace a video de referencia (Spread the Sign LSCh) y botón **🎥 Grabar VIDEO crudo**.
   Cada pulsación guarda una toma: `data/signs/video/NOMBRE__n.webm`. Duraciones de 1 a 4 s. Ideal 1–1,5 s para señas simples.
2. **Extraer manos con WiLoR** (más preciso que MediaPipe en dedos y muñeca): `ml/wilor_extract.py`. Corre desde `_tools/WiLoR` (fuera del repo) con el
   entorno conda `wilor` (Python 3.10, PyTorch/MPS). ~0,2 s/cuadro en Mac M5. Salida: `data/signs/wilor/NOMBRE__n.wilor.json`.
3. **Cocinar la toma** (`bake.html?v=NOMBRE__1,NOMBRE__2`): reproduce el video cuadro a cuadro; el cuerpo sale de MediaPipe Pose y las manos de WiLoR
   (pulgar de MediaPipe). Guarda `data/signs/baked/NOMBRE__n.json` (rotaciones de 36 huesos del avatar VRM a 30 fps). La página debe quedar abierta hasta "LISTO".
4. **Fusionar tomas** (`python3 ml/fuse_takes.py NOMBRE`): descarta los primeros 6 cuadros (el avatar converge desde el reposo), recorta pausas
   de inicio/fin, alinea con DTW, elige la toma más consistente, promedia las demás (descarta atípicas) y suaviza →
   `data/signs/anim/NOMBRE.json` (**esto sí se versiona**, pesa poco).
5. **Encadenar** (`chain.html`): escribe glosas separadas por espacio y el avatar las reproduce seguidas.

## Decisión: encadenado con solape adaptativo (Fluidez "alta", 0,45 s)
Las señas se **solapan**: mientras una termina, la siguiente ya empieza y se mezclan las poses (slerp con curva quíntica). El largo del solape depende de
cuánto cambia la pose entre el final de A y el inicio de B, con tope configurable.
Medido con `python3 ml/chain_sim.py` (56 parejas entre 8 señas; aceleración en el empalme vs la típica dentro de una seña, 20 rad/s²):

| Método | Aceleración en el empalme | × lo normal |
|---|---|---|
| Pegar sin transición | 3500 | 172× |
| Transición fija 0,3 s (primer intento) | 59 | 2,9× |
| **Solape máx 0,45 s (elegido)** | **34** | **1,7×** |
| Solape máx 0,6 s ("máxima") | 26 | 1,3× |

Tomás lo probó a ojo con 8 señas y lo aprobó ("super decente"). Costo: el solape consume ~0,4 s del final/inicio de señas de ~1,5 s.

## Limitaciones conocidas
- Una sola persona (Tomás) graba las señas: **hay que validarlas con una persona señante de LSCh**. Las fotos del diccionario son estáticas y el diccionario no describe el movimiento.
- Dedos de WiLoR: solo flexión (no abducción) y el pulgar sale de MediaPipe. Expresión facial: no hay (avatar sin cara animada).
- Las grabaciones arrancan con la mano ya en posición; no hay "preparación" desde el reposo, por eso el encadenado va de pose a pose.
- Números, alfabeto manual y horas **no están en el diccionario**: hay que grabarlos aparte (ver `docs/GUION-GRABACION.md`).
- Los videos (`data/signs/video`), salidas de WiLoR (`data/signs/wilor`) y tomas cocidas (`data/signs/baked`) están en `.gitignore`: son material personal y pesado.

## Licencias (importante antes de publicar)
- **WiLoR**: CC-BY-NC-ND (solo no comercial) y depende del modelo **MANO** (licencia propia, registro en mano.is.tue.mpg.de). Se usa solo offline en el sandbox;
  `_tools/` y `MANO_RIGHT.pkl` **no** se suben al repo del equipo. Lo que se sube son las animaciones resultantes (rotaciones del avatar), no el modelo.
- **Fotos del diccionario (UMCE)**: no se versionan. El texto del glosario sí está en el repo por decisión de Tomás (2026-11-21).
- **Avatar** `models/avatar.vrm`: sample de pixiv/three-vrm, no versionado (ver `lab/v4_avatar/live/README.md`).

## Por hacer
Ver `docs/GUION-GRABACION.md`: lista de glosas, prioridades, números/alfabeto y frases completas para mejorar las transiciones.
