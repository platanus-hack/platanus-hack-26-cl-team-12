# ADR-0006: Proveedores de STT y TTS en español chileno (TTS: ElevenLabs)

## Estado
Propuesto

## Contexto
La persona oyente habla español chileno (ritmo rápido, aspiración de la "s", modismos). Hay que
transcribirlo con baja latencia y, en el sentido inverso, la voz sintetizada debe sonar natural para un
interlocutor chileno. Ambos servicios deben integrarse con LiveKit Agents (ADR-0005).

## Decisión

### TTS (voz generada en español chileno): **ElevenLabs**
- **Modelo:** el modelo de **baja latencia con streaming** de ElevenLabs (familia *Flash* / *Turbo*) para
  la llamada en tiempo real; el modelo multilingüe de mayor calidad queda para contenido pregrabado
  (onboarding, tutoriales).
- **Acento chileno:** se elige una voz con acento chileno de la **Voice Library** o se crea una **voz
  propia** (voice cloning, solo con consentimiento de la persona dueña de la voz). El texto que recibe
  viene del agente (ADR-0004) ya en español chileno natural.
- **Integración:** plugin de ElevenLabs para LiveKit Agents, con streaming por WebSocket, para que el audio
  empiece a sonar mientras el LLM sigue generando texto.
- **Configuración:** `voice_id`, `model_id`, estabilidad y velocidad en variables de entorno, para
  ajustarlas sin desplegar.
- **Pronunciación:** un diccionario de pronunciación o normalización previa para siglas y nombres
  locales (por ejemplo "Buk", "RUT", "Fonasa").
- **Voz por usuario (futuro):** la persona sorda puede elegir "su voz" (género, edad, tono) en sus
  preferencias (ADR-0009). Es una decisión de identidad importante para el usuario.

### STT (transcripción del español hablado)
- Proveedor con **streaming** y soporte de español latinoamericano o chileno, accesible desde un plugin de
  LiveKit Agents. Candidatos: **Deepgram** (baja latencia) y **Azure Speech (es-CL)**; **ElevenLabs STT**
  si se quiere un solo proveedor de voz. La elección final se hace con una **prueba de 30 minutos**:
  20 frases grabadas por el equipo, midiendo WER y latencia.

### Transversal
- El agente usa las interfaces STT/TTS del framework, de modo que cambiar de proveedor sea un cambio de configuración.
- **Subtítulos primero:** el texto se publica por data channel antes o en paralelo al audio TTS, para que la
  persona oyente nunca espere sin retroalimentación.

## Consecuencias

### Positivas
- Voz más natural y expresiva que el TTS tradicional, con un acento elegible o clonado: mejor aceptación de la persona oyente.
- El streaming de baja latencia contribuye a la meta de < 3 s (ver README).
- La persona sorda puede tener una **voz propia y consistente** en todas sus llamadas.
- Plugin existente para LiveKit Agents, con poca integración propia.

### Negativas
- Costo por carácter más alto que Azure u otros proveedores tradicionales; hay que monitorear el consumo (el plan gratuito tiene cuota limitada).
- El acento chileno depende de la voz elegida, no de un locale `es-CL` nativo; hay que probar y validar varias voces.
- El voice cloning exige consentimiento explícito y cuidado contra el mal uso (suplantación).

### Neutrales
- El benchmark de STT genera un pequeño dataset de audio útil para regresiones futuras.

## Alternativas consideradas

**Azure Speech TTS (voces neuronales es-CL)**
- Considerada: tiene locale es-CL nativo y es más barata. Se rechaza como opción principal por su menor naturalidad y expresividad. **Queda como respaldo** si se agota la cuota de ElevenLabs.

**Google Cloud TTS / Amazon Polly**
- Rechazadas: menor naturalidad y poca oferta de voces chilenas.

**Whisper self-hosted (faster-whisper) para STT**
- Rechazada para el MVP: requiere GPU y streaming propio. Buena opción a futuro por costo o privacidad.

**APIs de voz del navegador (Web Speech API)**
- Rechazada: soporte inconsistente entre plataformas (especialmente iOS y WebView) y sin control de calidad.

## Referencias
- ElevenLabs API (TTS streaming, Voice Library, voice cloning)
- Plugin de ElevenLabs para LiveKit Agents
- ADR-0004, ADR-0005, ADR-0009
