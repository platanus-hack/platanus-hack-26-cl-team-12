// Conexión de la app con la llamada real (plan C de A): la API (services/api) llama por Twilio, transcribe y
// traduce, y le habla a la app por el WebSocket /twilio/cliente con los mensajes de docs/contrato.md:
// la API manda `estado` y `ejecutivo_dice`; la app manda `cliente_dice`.
// La app no necesita claves: las de Twilio y Claude viven solo en el .env del servidor.
// (LiveKit se descartó: el equipo decidió no usarlo.)
import { parseMensaje, type MensajePuente } from "@puente/glosses";

export interface CallHandle {
  send(msg: MensajePuente): Promise<void>;
  leave(): void;
}

export interface CallOpts {
  onMessage: (m: MensajePuente) => void;
  /** Se cortó la conexión sin que el usuario colgara (internet, servidor caído). */
  onDesconectado?: () => void;
  /** Contacto elegido: la API llama por teléfono (POST /llamadas) cuando el canal ya está abierto. */
  destino?: string;
}

// La API en el plan gratis de Render se duerme y tarda ~30-60 s en despertar: con 8 s la primera llamada fallaba.
// Además la app la despierta al abrirse (despertarServidor).
const ESPERA_CONEXION_MS = 20_000;

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

/** Pide /health sin esperar la respuesta: si la API estaba dormida, empieza a despertar antes de que el usuario llame. */
export function despertarServidor(): void {
  try {
    void fetch(apiUrl() + "/health", { cache: "no-store" }).catch(() => {});
  } catch {
    // sin NEXT_PUBLIC_API_URL en producción: el error se muestra al llamar
  }
}

export function joinCall({ onMessage, onDesconectado, destino }: CallOpts): Promise<CallHandle> {
  // A4: la API exige `?token=CLIENTE_WS_TOKEN` cuando está configurado. Es una clave de demo compartida (queda en el
  // navegador), no un secreto de usuario. TODO(real-data): token por sesión cuando haya login real.
  const token = process.env.NEXT_PUBLIC_CLIENTE_WS_TOKEN?.trim();
  const ws = new WebSocket(apiUrl().replace(/^http/, "ws") + "/twilio/cliente" + (token ? `?token=${encodeURIComponent(token)}` : ""));
  let colgo = false;
  let abierto = false; // si nunca abrió, el error lo informa reject (no hay llamada que "se cortó")

  return new Promise((resolve, reject) => {
    const plazo = setTimeout(() => {
      ws.close();
      reject(new Error("el servidor no responde"));
    }, ESPERA_CONEXION_MS);

    ws.onopen = async () => {
      clearTimeout(plazo);
      abierto = true;
      // Con el canal abierto (para no perder el `estado` inicial), la API hace sonar el teléfono del ejecutivo.
      if (destino) {
        try {
          const r = await fetch(apiUrl() + "/llamadas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ destino }),
          });
          if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { detail?: string }).detail ?? `error ${r.status}`);
        } catch (e) {
          colgo = true;
          ws.close();
          reject(e instanceof Error ? e : new Error("no se pudo llamar"));
          return;
        }
      }
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
      // Revisión de código (D, punto 5): sin esto, si se cae la conexión la app queda en "En llamada" para siempre.
      // Solo si la llamada alcanzó a abrir: si no, quedaba en "Califica tu llamada" de una llamada que nunca existió.
      if (abierto && !colgo) onDesconectado?.();
    };
  });
}
