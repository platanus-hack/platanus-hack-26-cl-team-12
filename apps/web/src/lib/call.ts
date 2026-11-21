// Conexión a la sala de LiveKit (ADR-0005). El agente traductor es otro participante;
// los mensajes del contrato (docs/contrato.md) llegan por data channel.
import { ParticipantKind, Room, RoomEvent } from "livekit-client";
import { SOLO_AGENTE, parseMensaje, type MensajePuente } from "@puente/glosses";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface CallHandle {
  send(msg: MensajePuente): Promise<void>;
  leave(): void;
}

export async function joinCall(opts: { onMessage: (m: MensajePuente) => void }): Promise<CallHandle> {
  // TODO(v1): pasar el número de destino; la API crea la llamada SIP saliente (ADR-0005).
  // El servidor decide identidad, sala y rol; el cliente no manda nada (ver services/api /token).
  const res = await fetch(`${API_URL}/token`, { method: "POST" });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const { url, token } = (await res.json()) as { url: string; token: string };

  const room = new Room();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  room.on(RoomEvent.DataReceived, (payload, participant) => {
    const msg = parseMensaje(decoder.decode(payload));
    if (!msg) return;
    // Estos tipos solo los emite el agente; `kind` lo asigna LiveKit, no el remitente.
    if (SOLO_AGENTE.has(msg.tipo) && participant?.kind !== ParticipantKind.AGENT) return;
    opts.onMessage(msg);
  });

  await room.connect(url, token);
  // TODO(v3): publicar glosas reconocidas por @puente/signs como `glosas_cliente`.

  return {
    async send(msg) {
      await room.localParticipant.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true });
    },
    leave() {
      void room.disconnect();
    },
  };
}
