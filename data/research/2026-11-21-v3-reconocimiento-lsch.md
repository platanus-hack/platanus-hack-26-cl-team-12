# v3 — Reconocimiento de señas (cámara → texto)
**Conclusión:** no existe un modelo listo para LSCh. Camino realista para la demo: **MediaPipe (puntos de manos y pose) + clasificador chico entrenado por nosotros con 20–40 señas del escenario**, más deletreo (alfabeto) como respaldo.

## Hallazgos
- Referencia metodológica (LSC colombiana, 2025): MediaPipe con ~27 señas → ~90 % letras y ~82 % palabras. Señas estáticas: basta con manos; dinámicas: manos + pose.
- Datasets LSCh en Roboflow: uno de 26 clases (A–Z) y otro de 32 clases; **faltan origen y licencia**. Sirven solo para alfabeto, no para palabras.
- TUB Sign Language Corpus incluye LSCh sacado de medios chilenos (con subtítulos): útil como fuente, no está listo para entrenar.
- Los datasets de palabras/frases en LSCh prácticamente no existen → **grabar nuestro propio dataset** (varias personas × 20–40 señas × 30 repeticiones) con ayuda de una persona señante.

## Riesgos
- Señas dinámicas y variación entre personas: precisión baja con pocos datos. Mitigar con vocabulario cerrado y "confirmar" en pantalla antes de hablar.
- Inferencia en celular: MediaPipe Tasks corre en navegador (WASM/WebGL), la PWA lo soporta.

## Próximos pasos
1. Probar MediaPipe Hand/Holistic en el navegador (demo de puntos).
2. Definir lista de señas del escenario (sale del glosario en PDF).
3. Herramienta simple para grabar muestras etiquetadas.

## Fuentes
- [Roboflow: LSCh desde cero (26 clases)](https://universe.roboflow.com/project-jak2u/lengua-de-senas-chilena-desde-cero) · [Roboflow: lengua señas chilena (32 clases)](https://universe.roboflow.com/lenguaseaschilena/lengua-senas-chilena)
- [TUB Sign Language Corpus Collection](https://arxiv.org/pdf/2508.05374)
- [Artículo LSC colombiana con MediaPipe (Redalyc)](https://www.redalyc.org/journal/4139/413982851001/413982851001.pdf)
