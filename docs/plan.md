# Plan (incremental, cada versión incluye la anterior)
Cliente = persona sorda. Ejecutivo = persona al teléfono.

1. **v1** Ejecutivo llama → voz a texto en la app del cliente; el cliente escribe → la app habla por teléfono.
2. **v2** v1 + LLM que simplifica lo que dice el ejecutivo y "complejiza" lo que escribe el cliente.
3. **v3** v2 + el cliente firma frente a la cámara → texto → voz (vocabulario acotado).
4. **v4** Voz del ejecutivo → avatar en lengua de señas; el cliente responde firmando.

Escenario único de demo: _(por definir: reserva de hora médica / banco)_

## Reparto (ramas)
- v1-telefonia: Twilio + STT/TTS  (app/backend/telefonia)
- v2-llm: simplificar/complejizar  (app/backend/llm)
- v3-vision: MediaPipe + clasificador  (app/web/camara)
- v4-avatar: avatar/clips + frontend  (app/web/avatar)
