# v5 · reconocimiento de señas (laboratorio)

Banco de pruebas para la lectura de señas de la persona sorda (ADR-0002). El código que usa la app está en
`packages/signs` (`createPauseRecognizer`) y `apps/web/src/lib/reconocimiento.ts`; esto es para grabar muestras, medir y ajustar.

## Flujo
```bash
python3 lab/v5_reconocimiento/server.py          # http://localhost:8766  (cámara + MediaPipe en el navegador)
```
1. **Muestras**: la página importa las tomas de `data/signs/video` (el symlink `data/signs-video` apunta a ellas) o graba nuevas
   (`🎯 Grabación guiada`, parámetros `?palabras=BRAZO,MANO&n=6`). Se guardan en `data/reco/` (gitignored: son puntos de manos y cuerpo de una persona).
2. **Prueba guiada** (P1, P2, P3 de `docs/GUION-1.md`): la señas y te da el acierto palabra por palabra. Cada corrida queda en `data/reco/runs/`
   con los datos crudos. Casilla "modo con pausa" = bajar las manos entre palabras (el modo recomendado para la demo).
3. **Ajustar sin volver a señar**: `node lab/v5_reconocimiento/replay.mjs --sens 0.65 --margin 0.85 --dedupe 2500 --verbose`
   reproduce las corridas guardadas con el algoritmo de la página.
4. **Exportar a la app**: `node lab/v5_reconocimiento/export_templates.mjs` → `apps/web/public/reco/templates.json`
   (traduce los nombres de la página a las glosas del diccionario del agente: HIJO-A→HIJO, SI→SÍ, …).

## En la app
`pnpm --filter @puente/web dev` (la lectura real viene activa; `NEXT_PUBLIC_RECONOCER_SENAS=0` vuelve a la simulada), abrir `/?mock=1&llamar=urgencias&debug=1`.
Señar con una pausa entre palabras y tocar **Enviar**. Con `?debug`: candidatas del reconocedor y `window.__senas(["HOLA", ...])` para simular señas.
Licencias: no subir videos ni salidas de WiLoR/MANO (no comerciales).
