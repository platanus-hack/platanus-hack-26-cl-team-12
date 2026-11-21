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

## Flujo entrante (te llaman a ti)
Igual al ejemplo de llamadas entrantes de la documentación de LiveKit:
1. **Inbound trunk** con el número de Twilio (en Twilio, el *Origination URI* del trunk apunta al SIP URI de LiveKit).
2. **Dispatch rule individual** (`dispatchRuleIndividual`, `roomPrefix: "call-"`) con
   `roomConfig.agents = [{agentName: "inbound-agent"}]`: cada llamada crea su propia sala y despacha el agente.
   El worker se registra con `agent_name="inbound-agent"`.
3. Webhook `participant_joined` → `services/api` busca en `phone_numbers` (Supabase) a qué usuario hacer sonar y
   publica `call.incoming` por Realtime. La PWA entra con su token al tocar **Contestar**.
4. El agente reproduce la espera, el saludo y, si nadie contesta en `RING_TIMEOUT_S`, el buzón (como texto).

Diagrama de secuencia en `docs/ARQUITECTURA.md` §1.3. Plan B (Twilio Media Streams → FastAPI) en §1.7.

## Pendiente
- `TODO(v1)`: worker `inbound-agent` (espera, saludo, buzón), `/webhooks/livekit` en la API, `call.incoming` en `contract.ts` y aviso visual en `apps/web`.
- Hora límite: si 3 h antes de presentar la llamada SIP no conecta de punta a punta, pasar al plan B.
- `TODO(v1)`: implementar `/llamadas` en `services/api/app/main.py`.
- Audio telefónico a 8 kHz: medir el STT con audios chilenos reales (`data/eval/`, ver `data/research/…-v1-telefonia-stt-tts.md`).
- Cuenta trial de Twilio: solo llama a números verificados.
