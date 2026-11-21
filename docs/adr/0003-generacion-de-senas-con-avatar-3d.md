# ADR-0003: Generación de señas con avatar 3D, no video generativo

## Estado
Propuesto

## Contexto
Cuando la persona oyente habla, la persona sorda debe ver el mensaje en LSCh. El objetivo inicial era un
"video generado por IA". En lengua de señas, una mano mal formada o un movimiento impreciso **cambia el
significado**, y la respuesta debe llegar en segundos.

## Decisión
Ejecutar las glosas (ADR-0001) con un **avatar 3D en el cliente** (Three.js + modelo VRM), animado con
**los mismos puntos clave capturados para el dataset** (ADR-0002) mediante retargeting a su esqueleto.
- Cada glosa del diccionario tiene una animación (`animationId`).
- Las animaciones se encadenan con interpolación (blending) de 150 a 250 ms entre señas.
- Las palabras fuera del vocabulario se deletrean con la dactilología del avatar.
- Siempre se muestran **subtítulos en español** junto al avatar como respaldo.

La "IA" de este flujo vive en la traducción a glosas (ADR-0004), no en la síntesis de píxeles.

## Consecuencias

### Positivas
- Precisión: cada seña es una captura real y validable, sin manos alucinadas.
- Tiempo real: el renderizado ocurre en el cliente, sin GPU en el servidor.
- Reutiliza el dataset del reconocimiento, así que una sola grabación sirve para dos usos.
- El avatar es personalizable (apariencia, velocidad de señas) y más inclusivo.

### Negativas
- El retargeting de puntos clave a huesos requiere trabajo de ajuste fino (sobre todo en los dedos).
- Las expresiones faciales del avatar son limitadas al inicio.
- Un avatar puede verse menos "humano" que un video real; hay que validar la aceptación con usuarios sordos.

### Neutrales
- Agregar señas requiere capturarlas; no se pueden "inventar" a partir de texto.

## Alternativas consideradas

**Clips de video concatenados (un video real por seña)**
- Considerada: es la opción más fiel y simple. Se rechaza como opción final porque las transiciones entre clips se ven entrecortadas y el peso de los videos es alto. **Se mantiene como respaldo** si el avatar no alcanza a estar listo.

**Video generativo (texto o pose → video con modelos de difusión)**
- Rechazada: no funciona en tiempo real, cuesta GPU por segundo de video y suele deformar manos y dedos, lo que en señas es un error de significado.

**Avatar con animaciones hechas a mano por un animador**
- Rechazada: no escala dentro de la hackathon.

## Referencias
- three.js, @pixiv/three-vrm
- ADR-0001, ADR-0002, ADR-0004
