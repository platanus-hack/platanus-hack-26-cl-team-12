# Resultado: ElevenLabs Scribe (scribe_v1) en español chileno
Prueba con 10 frases de hora médica, grabadas por Tomás en WhatsApp (opus; **audio limpio, no 8 kHz telefónico**). Script: `lab/v1_voz/stt_bench.py`.

- WER total 10,5 % (parte de las diferencias son solo "12" vs "doce", no errores reales).
- Latencia por archivo (batch): 0,3–0,8 s.
- **Errores reales (importan):** nombres propios ("Camila del centro médico Los Aromos" → "Va la comida … Los Árabes"), sigla "RUT" → "nombre", y **"diez y media" → "10:09"** (hora equivocada: crítico).
- 7 de 10 frases perfectas.

## Pendiente
- Repetir con audio de llamada real (8 kHz) y modo streaming/realtime.
- Comparar con Deepgram Nova-3 y Whisper sobre los mismos audios.
- Mitigaciones: vocabulario/keyterms (RUT, nombre del centro), y que el LLM de v2 marque horas y cifras para que el cliente las confirme.
