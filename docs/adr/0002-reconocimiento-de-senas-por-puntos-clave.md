# ADR-0002: Reconocimiento de señas por puntos clave (MediaPipe) y vocabulario acotado

## Estado
Propuesto

## Contexto
Hay que convertir el video de la cámara de la persona sorda en una secuencia de glosas (ADR-0001), con
latencia baja y en dispositivos variados (ADR-0007). No hay datasets públicos grandes de LSCh, y el
tiempo de hackathon es de unas 36 horas.

## Decisión
1. **Extraer puntos clave en el cliente** con MediaPipe (Hand Landmarker + Pose + Face, o Holistic) en JavaScript.
2. **Clasificar secuencias de puntos clave** con un modelo pequeño (LSTM/GRU o Transformer de pocas capas)
   entrenado en PyTorch, exportado a **ONNX** y ejecutado con `onnxruntime-web` en el cliente
   (con respaldo en el servidor si el dispositivo no da abasto).
3. **Vocabulario acotado** de 30 a 80 señas para un caso de uso concreto (por ejemplo, entrevista u
   onboarding laboral), con un **dataset propio**: unas 20 repeticiones por seña, varias personas,
   varias condiciones de luz y fondo.
4. **Segmentación** por pausas o velocidad de manos, más un umbral de confianza: bajo el umbral, la seña
   se marca como "no reconocida" en vez de adivinarse.

## Consecuencias

### Positivas
- Los puntos clave son ~100× más livianos que el video, lo que da baja latencia y menos ancho de banda.
- Privacidad: el video no sale del dispositivo (ADR-0010).
- El modelo es pequeño: entrena en minutos en una GPU de Colab o Modal.
- Normalizar por posición y escala de los hombros reduce la dependencia de quién hace la seña.

### Negativas
- El vocabulario es cerrado: las señas fuera del diccionario no se reconocen.
- Las señas continuas (frases fluidas) son mucho más difíciles que las señas aisladas; el MVP asume una ligera pausa entre señas.
- La captura de expresión facial es limitada, por lo que se pierden algunos marcadores no manuales.

### Neutrales
- Grabar el dataset es una tarea del equipo que debe empezar en la hora 0.

## Alternativas consideradas

**LLM multimodal sobre cuadros de video**
- Rechazada como camino principal: latencia de segundos por consulta, costo por cuadro y baja precisión en LSCh. Se mantiene como plan B de demo.

**CNN/3D-CNN sobre píxeles (I3D, SlowFast)**
- Rechazada: requiere muchos más datos y GPU en inferencia, y es sensible a fondo e iluminación.

**Reconocimiento continuo con CTC**
- Pospuesta: es el camino correcto a largo plazo, pero necesita datos anotados a nivel de frase.

## Referencias
- MediaPipe Solutions (Hand Landmarker, Pose Landmarker, Holistic)
- ONNX Runtime Web
- ADR-0001, ADR-0007, ADR-0010
