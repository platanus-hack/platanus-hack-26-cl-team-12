// Conexión de la app con la llamada. Dos caminos, mismos mensajes (docs/contrato.md):
//
//   twilio (por defecto, plan C de A): la API (services/api) llama por Twilio, transcribe y traduce, y le habla a
//     la app por el WebSocket /twilio/cliente. Es lo que funciona hoy con la cuenta gratis de Twilio.
//   livekit (ADR-0005): sala de LiveKit con el agente traductor. Requiere Twilio pagado (SIP). Se elige con
//     NEXT_PUBLIC_TRANSPORTE=livekit.
//
// La app no necesita claves: las de Twilio, Claude y LiveKit viven solo en el .env del servidor.
import { ParticipantKind, Room, RoomEvent } from "livekit-client";
import { SOLO_AGENTE, parseMensaje, type MensajePuente } from "@puente/glosses";

export interface CallHandle {
  send(msg: MensajePuente): Promise<void>;
  leave(): void;
}

export interface CallOpts {
  onMessage: (m: MensajePuente) => void;
  /** Se cortó la conexión sin que el usuario colgara (internet, servidor caído). */
  onDesconectado?: () => void;
}

const ESPERA_CONEXION_MS = 8000;

/**
 * Dirección del servidor. En desarrollo, si no está configurada, usa el de tu computador (localhost:8000).
 * En la app publicada NO hay valor por defecto: si falta NEXT_PUBLIC_API_URL, avisa en vez de apuntar a localhost.
 */
function apiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (url) return url.replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:8000";
  throw new Error("la app no tiene configurado el servidor (NEXT_PUBLIC_API_URL)");
}

export function joinCall(opts: CallOpts): Promise<CallHandle> {
  return process.env.NEXT_PUBLIC_TRANSPORTE === "livekit" ? joinLiveKit(opts) : joinTwilio(opts);
}

/** Plan C: WebSocket con la API. La API manda `estado`, `ejecutivo_dice`; la app manda `cliente_dice`. */
function joinTwilio({ onMessage, onDesconectado }: CallOpts): Promise<CallHandle> {
  // A4: la API exige `?token=CLIENTE_WS_TOKEN` cuando está configurado. Es una clave de demo compartida (queda en el
  // navegador), no un secreto de usuario. TODO(real-data): token por sesión cuando haya login real.
  const token = process.env.NEXT_PUBLIC_CLIENTE_WS_TOKEN?.trim();
  const ws = new WebSocket(apiUrl().replace(/^http/, "ws") + "/twilio/cliente" + (token ? `?token=${encodeURIComponent(token)}` : ""));
  let colgo = false;

  return new Promise((resolve, reject) => {
    const plazo = setTimeout(() => {
      ws.close();
      reject(new Error("el servidor no responde"));
    }, ESPERA_CONEXION_MS);

    ws.onopen = () => {
      clearTimeout(plazo);
      resolve({
        async send(msg) {
          if (ws.readyState !== WebSocket.OPEN) throw new Error("sin conexión");
          ws.send(JSON.stringify(msg));
        },
        leave() {
          colgo = true;
          // TODO(v1, A): la API todavía no tiene un endpoint para cortar la llamada de Twilio; hoy solo se cierra
          // el canal con la app y el teléfono sigue hasta que el ejecutivo corta.
          ws.close();
        },
      });
    };
    ws.onerror = () => {
      clearTimeout(plazo);
      reject(new Error("no se pudo conectar con el servidor"));
    };
    ws.onmessage = (e) => {
      const msg = typeof e.data === "string" ? parseMensaje(e.data) : null;
      if (msg) onMessage(msg);
    };
    ws.onclose = () => {
      clearTimeout(plazo);
      if (!colgo) onDesconectado?.();
    };
  });
}

/** ADR-0005: sala de LiveKit con el agente. El agente es otro participante; los mensajes van por data channel. */
async function joinLiveKit({ onMessage, onDesconectado }: CallOpts): Promise<CallHandle> {
  // TODO(v1): pasar el número de destino; la API crea la llamada SIP saliente (ADR-0005).
  // El servidor decide identidad, sala y rol; el cliente no manda nada (ver services/api /token).
  const res = await fetch(`${apiUrl()}/token`, { method: "POST" });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const { url, token } = (await res.json()) as { url: string; token: string };

  const room = new Room();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let colgo = false;

  room.on(RoomEvent.DataReceived, (payload, participant) => {
    const msg = parseMensaje(decoder.decode(payload));
    if (!msg) return;
    // Estos tipos solo los emite el agente; `kind` lo asigna LiveKit, no el remitente.
    if (SOLO_AGENTE.has(msg.tipo) && participant?.kind !== ParticipantKind.AGENT) return;
    onMessage(msg);
  });
  // Revisión de código (D, punto 5): sin esto, si se cae la conexión la app queda en "En llamada" para siempre.
  room.on(RoomEvent.Disconnected, () => {
    if (!colgo) onDesconectado?.();
  });

  await room.connect(url, token);
  // TODO(v3): publicar glosas reconocidas por @puente/signs como `glosas_cliente`.

  return {
    async send(msg) {
      await room.localParticipant.publishData(encoder.encode(JSON.stringify(msg)), { reliable: true });
    },
    leave() {
      colgo = true;
      void room.disconnect();
    },
  };
}
