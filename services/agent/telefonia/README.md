# Telefonía (v1): LiveKit SIP + Twilio

El ejecutivo **no instala nada**: lo llamamos (o nos llama) por teléfono normal. Twilio conecta la
red telefónica con LiveKit por SIP, y el ejecutivo entra a la sala como un participante más, junto
al cliente (PWA) y al agente traductor (ADR-0005).

## Configuración (una vez)
1. **Twilio:** comprar un número (verificar disponibilidad de número chileno; si no hay, un número de EE. UU.
   sirve para la demo) y crear un **Elastic SIP Trunk**.
2. **LiveKit Cloud → Telephony:**
   - *Outbound trunk* hacia el dominio de terminación del trunk de Twilio (con credenciales) → `LIVEKIT_SIP_TRUNK_ID`.
   - *Inbound trunk* y *dispatch rule* (opcional) para que las llamadas entrantes creen una sala y despachen el agente.
3. Variables en `.env`: `TWILIO_*`, `LIVEKIT_SIP_TRUNK_ID`.

## Flujo saliente (cliente llama al banco o la clínica)
PWA → `POST /llamadas {room, numero}` (services/api) → `CreateSIPParticipant` → suena el teléfono →
el ejecutivo contesta y su audio entra a la sala → el agente lo transcribe.

## Pendiente
- `TODO(v1)`: implementar `/llamadas` en `services/api/app/main.py`.
- Audio telefónico a 8 kHz: medir el STT con audios chilenos reales (`data/eval/`, ver `data/research/…-v1-telefonia-stt-tts.md`).
- Cuenta trial de Twilio: solo llama a números verificados.
