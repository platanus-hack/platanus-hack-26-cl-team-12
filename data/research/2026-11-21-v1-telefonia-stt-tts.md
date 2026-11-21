# v1 — Telefonía + STT/TTS
**Conclusión:** Twilio Media Streams (WebSocket bidireccional, audio μ-law 8 kHz) + STT en streaming + TTS que devuelve audio μ-law a la llamada. Alternativa más rápida de armar: Twilio ConversationRelay (Twilio hace STT/TTS y tu backend solo recibe/envía texto).

## Opciones
| Opción | Pros | Contras |
|---|---|---|
| Media Streams + Deepgram (STT) + ElevenLabs/Deepgram (TTS) | Control total, hay tutoriales FastAPI | Más piezas, hay que manejar μ-law |
| **ConversationRelay** | Twilio resuelve STT/TTS y turnos; backend solo texto por WebSocket | Menos control del proveedor de voz |
| OpenAI Realtime / Deepgram Voice Agent | Todo en uno | Pensado para agente de IA, no para "puente" humano-humano |

## Riesgos
- **STT en español chileno a 8 kHz**: Deepgram Nova-3 mejoró ~21 % relativo en español vs Nova-2, pero sus benchmarks son a 16 kHz; no hay cifras para acento chileno por teléfono. Hay reportes de fallas con números en español (`language=multi`). **Hay que medir con audios propios** (`data/eval/`). Probar también Flux-Multi y Whisper.
- **Latencia** de la cadena STT → app → TTS: medir pronto.
- Twilio en Chile: verificar si se puede obtener/recibir número chileno; si no, número US + llamar desde un celular (suficiente para la demo). Cuenta trial: solo llama a números verificados.

## Próximos pasos
1. Cuenta Twilio + número; webhook `/voice` con `<Connect><Stream>`.
2. Prueba mínima: llamar y ver transcripción en consola.
3. Mini-benchmark de STT con 10 frases chilenas grabadas por teléfono.

## Fuentes
- [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams.md)
- [Deepgram + Twilio STT](https://developers.deepgram.com/docs/twilio-and-deepgram-stt) · [Deepgram + Twilio TTS](https://developers.deepgram.com/docs/twilio-and-deepgram-tts)
- [Twilio ConversationRelay + FastAPI (traducción en tiempo real)](https://www.twilio.com/en-us/blog/developers/tutorials/product/real-time-voice-translation-python-fastapi-conversationrelay)
- [Nova-3 español](https://deepgram.com/learn/deepgram-expands-nova-3-with-spanish-french-and-portuguese-support) · [Benchmarks Deepgram](https://www.deepgram.com/benchmarks) · [Discusión Nova-3 vs Flux en español](https://github.com/orgs/deepgram/discussions/1605)
