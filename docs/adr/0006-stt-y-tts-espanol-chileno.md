# ADR-0006: Proveedores de STT y TTS en español chileno

## Estado
Propuesto

## Contexto
La persona oyente habla español chileno (ritmo rápido, aspiración de la "s", modismos). Hay que
transcribirlo con baja latencia y, en el sentido inverso, la voz sintetizada debe sonar natural para un
interlocutor chileno. Ambos servicios deben integrarse con LiveKit Agents (ADR-0005).

## Decisión
- **STT:** proveedor con **streaming** y soporte de español latinoamericano o chileno, accesible desde un
  plugin de LiveKit Agents. Candidatos en orden: **Deepgram** (baja latencia) y **Azure Speech (es-CL)**.
  La elección final se hace con una **prueba de 30 minutos**: 20 frases grabadas por el equipo, midiendo
  WER y latencia.
- **TTS:** **Azure Speech** con voces neuronales **es-CL**; **ElevenLabs** como alternativa si se
  prioriza la naturalidad.
- **Abstracción:** el agente usa las interfaces STT/TTS del framework, de modo que cambiar de proveedor
  sea un cambio de configuración.
- **Subtítulos primero:** el texto se publica por data channel antes o en paralelo al audio TTS, para que
  la persona oyente nunca espere sin retroalimentación.

## Consecuencias

### Positivas
- Voz con acento local y mejor aceptación de la persona oyente.
- El streaming en STT y TTS contribuye a la meta de < 3 s (ver README).
- La capa de abstracción evita quedar amarrado a un proveedor.

### Negativas
- Dos proveedores más (cuentas, llaves, costos por minuto o carácter).
- El soporte específico de es-CL varía entre proveedores; hay que verificarlo al momento de implementar.

### Neutrales
- El benchmark inicial genera un pequeño dataset de audio útil para regresiones futuras.

## Alternativas consideradas

**Whisper self-hosted (faster-whisper)**
- Rechazada para el MVP: requiere GPU y streaming propio. Buena opción a futuro por costo o privacidad.

**APIs de voz del navegador (Web Speech API)**
- Rechazada: soporte inconsistente entre plataformas (especialmente iOS y WebView) y sin control de calidad.

**Speech-to-speech end-to-end**
- No aplica: el flujo necesita texto intermedio (glosas y subtítulos).

## Referencias
- LiveKit Agents (plugins de STT y TTS)
- ADR-0004, ADR-0005
