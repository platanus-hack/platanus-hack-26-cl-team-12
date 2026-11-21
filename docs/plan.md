# Plan (incremental, cada versión incluye la anterior)
Cliente = persona sorda. Ejecutivo = persona al teléfono.

1. **v1** Ejecutivo llama → voz a texto en la app del cliente; el cliente escribe → la app habla por teléfono.
2. **v2** v1 + LLM que simplifica lo que dice el ejecutivo y "complejiza" lo que escribe el cliente.
3. **v3** v2 + el cliente firma frente a la cámara → texto → voz (vocabulario acotado).
4. **v4** Voz del ejecutivo → avatar en lengua de señas; el cliente responde firmando.

Escenario único de demo: _(por definir: reserva de hora médica / banco)_

## Reparto (ramas)
- v1-telefonia: Twilio + LiveKit SIP + STT/TTS  (services/agent/telefonia, services/api `/llamadas`)
- v2-llm: simplificar/complejizar  (services/agent/translator)
- v3-vision: MediaPipe + clasificador  (packages/signs, ml/training)
- v4-avatar: avatar/clips + frontend  (packages/avatar, apps/web)
