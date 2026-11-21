// Llamada simulada (?mock=1): reemplaza a LiveKit + el agente para probar la app sin backend.
// Se comporta igual que joinCall (misma interfaz CallHandle y mismos mensajes del contrato),
// así que la pantalla no sabe si la llamada es real o de mentira.
// Escenario de la demo: la persona sorda llama a urgencias de la clínica para pedir una ambulancia.
// TODO(real-data): glosas tomadas del escenario real cuando B lo congele.
import type { MensajePuente } from "@puente/glosses";
import type { CallHandle } from "./call";

interface Turno {
  texto: string; // lo que "dice" la operadora, tal cual
  simple: string; // la versión simple (v2)
  glosas: string[]; // lo que el avatar haría en señas (v4)
  opciones?: string[]; // respuestas rápidas sugeridas (contrato: ejecutivo_dice.opciones, máx. 4)
}

const GUION: Turno[] = [
  {
    texto: "Urgencias de Clínica Santa María, buenas tardes. ¿Cuál es su emergencia?",
    simple: "Urgencias de la Clínica. ¿Qué emergencia tiene?",
    glosas: ["URGENCIA", "CLÍNICA", "QUÉ", "PASAR"],
    opciones: ["Necesito una ambulancia", "Mi papá se desmayó", "Me duele mucho el pecho"],
  },
  {
    texto: "Entiendo, vamos a ayudarlo. ¿Me puede dar la dirección exacta donde se encuentra, con la comuna?",
    simple: "Vamos a ayudarlo. ¿Cuál es su dirección? Diga también la comuna.",
    glosas: ["AYUDAR", "DIRECCIÓN", "CUÁL", "COMUNA"],
  },
  {
    texto: "Muy bien. ¿La persona está consciente? ¿Respira con normalidad?",
    simple: "¿La persona está despierta? ¿Respira bien?",
    glosas: ["PERSONA", "DESPIERTO", "RESPIRAR", "BIEN"],
    opciones: ["Sí, respira", "No responde", "Respira con dificultad"],
  },
  {
    texto: "Ya despachamos una ambulancia a su dirección. Debería llegar en aproximadamente diez minutos.",
    simple: "La ambulancia va en camino. Llega en unos 10 minutos.",
    glosas: ["AMBULANCIA", "VENIR", "TEXTO:10", "MINUTO"],
    opciones: ["Gracias", "¿Qué hago mientras?"],
  },
  {
    texto: "Quédese junto a la persona, no le dé nada de comer ni de beber, y deje la puerta abierta para el equipo.",
    simple: "Quédese con la persona. No le dé comida ni agua. Deje la puerta abierta.",
    glosas: ["QUEDAR", "PERSONA", "COMIDA", "AGUA", "NO", "PUERTA", "ABRIR"],
    opciones: ["Entendido", "Repita, por favor"],
  },
  {
    texto: "Si algo cambia, vuelva a llamarnos. La ambulancia ya va en camino.",
    simple: "Si algo cambia, llame de nuevo. La ambulancia ya viene.",
    glosas: ["CAMBIAR", "LLAMAR", "AMBULANCIA", "VENIR"],
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
      later(3000, () => {
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
  later(1200, siguiente);

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
