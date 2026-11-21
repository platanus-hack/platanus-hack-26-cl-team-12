# ADR-0010: Privacidad: puntos clave en el cliente y sin almacenar video

## Estado
Propuesto

## Contexto
La plataforma procesa **video del rostro y el cuerpo** y **voz** de personas, que son datos personales y
potencialmente biométricos. Los usuarios sordos pueden tratar temas sensibles (salud, trabajo, trámites).
En Chile rige la normativa de protección de datos personales, actualizada recientemente con una nueva
ley y su agencia fiscalizadora. Un incidente de privacidad destruiría la confianza de una comunidad pequeña.

## Decisión
Aplicar **privacidad por diseño**:
1. **El video no sale del dispositivo para traducirse:** la extracción de puntos clave y la
   clasificación ocurren en el cliente (ADR-0002); al agente solo llegan las glosas.
   (El video de la videollamada entre las personas sí viaja por LiveKit, cifrado con DTLS/SRTP.)
2. **No se graban ni video ni audio** de las llamadas.
3. **Transcripciones solo con consentimiento explícito** y con retención limitada (por ejemplo, 30 días).
4. El **respaldo de puntos clave en el servidor** (ADR-0007) procesa en memoria, sin persistir cuadros.
5. **Mínimo privilegio:** tokens de LiveKit por sala y rol, llaves de terceros solo en el backend,
   RLS en Supabase (ADR-0009).
6. Los **datos de entrenamiento** (grabaciones de señas) se obtienen con consentimiento informado y
   firmado de cada persona grabada.
7. Hay que considerar qué datos se envían a proveedores (LLM, STT, TTS) y preferir opciones sin retención.

## Consecuencias

### Positivas
- Menor superficie de ataque y menor riesgo regulatorio.
- Argumento fuerte de confianza para usuarios y para el pitch.
- Menos ancho de banda al enviar glosas en vez de video al agente.

### Negativas
- Sin grabaciones no hay datos reales de uso para mejorar el modelo (solo con opt-in explícito).
- La depuración de errores de reconocimiento en producción es más difícil.

### Neutrales
- Hay que redactar una política de privacidad y un texto de consentimiento claros, también disponibles en LSCh.

## Alternativas consideradas

**Enviar video al servidor para reconocer**
- Rechazada: mayor latencia y costo, y expone datos biométricos.

**Grabar llamadas para entrenamiento**
- Rechazada por defecto; posible en el futuro solo con consentimiento granular y opt-in.

## Referencias
- Normativa chilena de protección de datos personales (verificar los requisitos vigentes con asesoría legal)
- ADR-0002, ADR-0005, ADR-0007, ADR-0009
