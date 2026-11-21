// Llamada simulada (?mock=1): reemplaza a LiveKit + el agente para probar la app sin backend.
// Se comporta igual que joinCall (misma interfaz CallHandle y mismos mensajes del contrato),
// así que la pantalla no sabe si la llamada es real o de mentira.
// Escenario de la demo: la persona sorda llama a urgencias porque su hijo se cayó y se quebró el codo.
// Glosas con foto en el Diccionario LSCh (las del vocabulario de hora médica + EXTRA de apps/web/scripts/extraer_senas.py).
// Lo que no tiene seña (brazo, codo, cifras) va como `TEXTO:<dato>`, igual que lo emite el agente.
// TODO(real-data): pedir a B un escenario `urgencia` con este vocabulario para que el agente real lo use.
import type { MensajePuente } from "@puente/glosses";
import type { CallHandle } from "./call";

interface Turno {
  texto: string; // lo que "dice" la operadora, tal cual
  simple: string; // la versión simple (v2)
  glosas: string[]; // lo que el avatar haría en señas (v4)
  opciones?: string[]; // respuestas rápidas sugeridas (contrato: ejecutivo_dice.opciones, máx. 4)
}

// Guion de la demo (Rafael, 21-11-2026): caída de un niño. Habla primero la persona sorda; su primera frase
// la ofrece la app (Destino.frasesIniciales). Las `opciones` son las frases del guion para tocarlas en la demo.
// Ojo: el agente real limita cada opción a 40 caracteres (contrato); acá son más largas porque es un guion fijo.
const GUION: Turno[] = [
  {
    texto: "Hola, ¿su hijo está consciente y respira bien?",
    simple: "¿Su hijo está despierto?\n¿Respira bien?",
    glosas: ["HOLA", "HIJO", "RESPIRAR", "QUÉ"],
    opciones: ["Sí, está consciente, pero no puede apoyar el codo y el brazo está muy hinchado."],
  },
  {
    texto: "Entendido. ¿Hay sangrado o el brazo se ve pálido o frío?",
    simple: "¿Sale sangre?\n¿El brazo está pálido o frío?",
    glosas: ["COMPRENDER", "SANGRE", "PÁLIDO", "FRÍO", "QUÉ"],
    opciones: ["Hay un poco de sangre, pero el brazo está normal. Necesito un traslado urgente."],
  },
  {
    texto: "Registramos la solicitud de ambulancia. Tenemos su dirección señora, vamos en camino. Mientras llega, no mueva el brazo ni el codo de su hijo.",
    simple: "La ambulancia va en camino.\nYa tenemos su dirección.\nNo mueva el brazo ni el codo de su hijo.",
    glosas: ["AMBULANCIA", "VENIR", "URGENTE", "DOMICILIO", "TEXTO:brazo", "NO"],
    opciones: ["Gracias", "Repita, por favor"],
  },
];

const ESPERA_RESPUESTA_MS = 2000; // lo que "tarda" la operadora en contestar
const PIDE_REPETIR = /repit|otra vez|no entend/i;

export async function joinMockCall(opts: { onMessage: (m: MensajePuente) => void }): Promise<CallHandle> {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let turno = 0;
  let terminada = false;

  const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

  function decirTurno(t: Turno) {
    opts.onMessage({ tipo: "ejecutivo_dice", texto: t.texto, simple: t.simple, ...(t.opciones && { opciones: t.opciones }) });
    opts.onMessage({ tipo: "glosas_para_senar", glosas: t.glosas, subtitulo: t.simple });
  }

  function siguiente() {
    const t = GUION[turno];
    if (!t || terminada) return;
    turno += 1;
    decirTurno(t);
    if (turno === GUION.length) {
      later(10000, () => {
        terminada = true;
        opts.onMessage({ tipo: "estado", valor: "llamada_terminada" });
      });
    }
  }

  function repetir() {
    const t = GUION[turno - 1];
    if (t && !terminada) decirTurno(t);
  }

  // Simula lo que tarda en conectar y que contesten.
  await new Promise((r) => setTimeout(r, 1000));
  opts.onMessage({ tipo: "estado", valor: "llamada_iniciada" });
  // En el guion habla primero la persona sorda: la operadora espera su mensaje.

  return {
    async send(msg) {
      // Si el cliente pide que repita, repite; si no, la operadora dice la siguiente línea del guion.
      if (msg.tipo === "cliente_dice") later(ESPERA_RESPUESTA_MS, PIDE_REPETIR.test(msg.texto) ? repetir : siguiente);
      if (msg.tipo === "glosas_cliente") later(ESPERA_RESPUESTA_MS, siguiente);
    },
    leave() {
      terminada = true;
      timers.forEach(clearTimeout);
    },
  };
}
