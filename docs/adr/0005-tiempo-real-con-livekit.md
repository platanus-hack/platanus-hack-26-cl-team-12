# ADR-0005: Llamadas en tiempo real con LiveKit y el traductor como participante

## Estado
Propuesto

## Contexto
Se necesita una llamada de video y audio entre dos personas, con un traductor que escucha el audio de la
persona oyente, recibe las glosas de la persona sorda y publica voz, subtítulos y glosas para el avatar.
Todo con baja latencia y en web, Android e iOS (ADR-0007).

## Decisión
Usar **LiveKit** (LiveKit Cloud en el MVP, self-host posible después) como SFU WebRTC y
**LiveKit Agents (Python)** para el traductor:
- El agente se une a la sala **como un participante más**.
- Se suscribe al audio de la persona oyente y lo pasa al STT (ADR-0006) y luego al LLM (ADR-0004).
- Recibe las glosas reconocidas por **data channel** (no video, ADR-0002/0010) y las pasa al LLM y luego al TTS.
- Publica una **pista de audio TTS** y mensajes de data channel (`subtitle`, `glosses`) que los clientes
  consumen para los subtítulos y el avatar.
- Los tokens de acceso a la sala los emite la API (FastAPI) con permisos mínimos por rol.

**Futuro (RF8):** conectar llamadas telefónicas con **LiveKit SIP + Twilio**, para que una persona sorda
pueda llamar a un número que solo atiende por teléfono.

## Consecuencias

### Positivas
- No se opera un servidor de medios propio; los SDK cubren JS, React Native, Swift, Kotlin y Flutter.
- El patrón "agente como participante" desacopla el traductor de los clientes.
- Interrupciones, detección de voz (VAD) y streaming vienen resueltos por el framework de agentes.
- Camino claro a llamadas telefónicas con SIP.

### Negativas
- Dependencia de LiveKit Cloud (costo por minuto fuera del plan gratuito).
- Cada llamada mantiene un proceso de agente vivo en el backend, lo que limita la concurrencia por instancia.

### Neutrales
- El equipo debe aprender el modelo de salas, pistas y participantes de LiveKit.

## Alternativas consideradas

**WebRTC propio (peer-to-peer + servidor de señalización)**
- Rechazada: hay que resolver TURN/STUN, NAT y la inyección del agente a mano.

**Daily / Agora / Twilio Video**
- Daily: alternativa válida, con buen SDK y Pipecat para agentes; se descarta por la integración más directa de LiveKit Agents. Twilio Video está en proceso de retiro. Agora: SDK más cerrado.

**Llamada solo por WebSocket con audio en chunks**
- Rechazada: latencia mayor, sin video y sin buen manejo de redes inestables.

## Referencias
- LiveKit Agents, LiveKit SIP
- ADR-0004, ADR-0006, ADR-0007
