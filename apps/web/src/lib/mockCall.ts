// Llamada simulada (?mock=1): reemplaza a LiveKit + el agente para probar la app sin backend.
// Se comporta igual que joinCall (misma interfaz CallHandle y mismos mensajes del contrato),
// así que la pantalla no sabe si la llamada es real o de mentira.
// Dos guiones de salud: la clínica te llama (entrante, versión 1) o tú llamas a pedir hora (saliente).
// Las glosas son del diccionario real (packages/glosses/data/glosses.json, hora médica) y los datos sin seña van
// como `TEXTO:<dato>`, igual que los emite el agente. `simple` viene en líneas cortas y `opciones` cuando hay pregunta.
import type { MensajePuente } from "@puente/glosses";
import type { CallHandle } from "./call";

interface Turno {
  texto: string; // lo que "dice" el ejecutivo, tal cual
  simple: string; // la versión simple (v2)
  glosas: string[]; // lo que el avatar firmaría (v4)
  opciones?: string[]; // respuestas rápidas sugeridas (v2)
}

const GUION_SALIENTE: Turno[] = [
  {
    texto: "Buenos días, Clínica Santa María, le saluda Carolina, ¿en qué la puedo ayudar?",
    simple: "Hola. Usted habla con la Clínica.\n¿Qué necesita?",
    glosas: ["HOLA", "HOSPITAL", "NECESITAR", "QUÉ"],
    opciones: ["Quiero pedir una hora"],
  },
  {
    texto: "Perfecto. ¿Me podría indicar su RUT, por favor?",
    simple: "¿Cuál es su RUT?",
    glosas: ["TEXTO:RUT", "QUÉ"],
  },
  {
    texto: "Gracias. Tengo disponibilidad con medicina general el lunes 24 a las diez de la mañana, ¿le acomoda ese horario?",
    simple: "Hay hora el lunes 24 a las 10:00.\nCon medicina general.\n¿Le sirve?",
    glosas: ["LUNES", "TEXTO:24", "TEXTO:10:00", "HORA", "MÉDICO", "BUENO"],
    opciones: ["Sí", "No"],
  },
  {
    texto: "Listo, quedó agendada su hora para el lunes a las diez. Recuerde llegar quince minutos antes.",
    simple: "Listo. Su hora es el lunes a las 10:00.\nLlegue 15 minutos antes.",
    glosas: ["LUNES", "TEXTO:10:00", "HORA", "COMPROBAR", "TEXTO:15", "MINUTO", "ANTES", "VENIR"],
  },
  {
    texto: "¿La puedo ayudar en algo más?",
    simple: "¿Necesita algo más?",
    glosas: ["NECESITAR", "MÁS", "QUÉ"],
    opciones: ["Sí", "No"],
  },
  {
    texto: "Que tenga un buen día, hasta luego.",
    simple: "Gracias. Que le vaya bien.",
    glosas: ["GRACIAS"],
  },
];

const GUION_ENTRANTE: Turno[] = [
  {
    texto: "Buenos días, le habla Carolina de Clínica Santa María. La llamo para confirmar su hora con medicina general el lunes 24 a las diez de la mañana. ¿Podrá asistir?",
    simple: "Hola. Soy Carolina, de la Clínica.\nTiene hora el lunes 24 a las 10:00.\n¿Va a ir?",
    glosas: ["HOLA", "HOSPITAL", "LUNES", "TEXTO:24", "TEXTO:10:00", "HORA", "MÉDICO", "VENIR", "PODER"],
    opciones: ["Sí", "No"],
  },
  {
    texto: "Perfecto. Le recuerdo traer su carnet y la orden médica, y llegar quince minutos antes.",
    simple: "Bien. Traiga su carnet y la orden médica.\nLlegue 15 minutos antes.",
    glosas: ["DOCUMENTO", "TENER", "TEXTO:15", "MINUTO", "ANTES", "VENIR"],
  },
  {
    texto: "¿Tiene alguna consulta sobre su atención?",
    simple: "¿Tiene alguna pregunta?",
    glosas: ["TÚ", "NECESITAR", "MÁS", "QUÉ"],
    opciones: ["Sí", "No"],
  },
  {
    texto: "Muchas gracias, que tenga un buen día.",
    simple: "Gracias. Que le vaya bien.",
    glosas: ["GRACIAS"],
  },
];

const ESPERA_RESPUESTA_MS = 2000; // lo que "tarda" el ejecutivo en contestar

export async function joinMockCall(opts: { onMessage: (m: MensajePuente) => void; entrante?: boolean }): Promise<CallHandle> {
  const GUION = opts.entrante ? GUION_ENTRANTE : GUION_SALIENTE;
  const timers: ReturnType<typeof setTimeout>[] = [];
  let turno = 0;
  let terminada = false;

  const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

  function hablaEjecutivo() {
    const t = GUION[turno];
    if (!t || terminada) return;
    turno += 1;
    opts.onMessage({ tipo: "ejecutivo_dice", texto: t.texto, simple: t.simple, ...(t.opciones && { opciones: t.opciones }) });
    opts.onMessage({ tipo: "glosas_para_senar", glosas: t.glosas, subtitulo: t.simple });
    if (turno === GUION.length) {
      later(2500, () => {
        terminada = true;
        opts.onMessage({ tipo: "estado", valor: "llamada_terminada" });
      });
    }
  }

  // Saliente: simula lo que tarda en conectar y que contesten. Entrante: ya contestaste, conecta altiro.
  await new Promise((r) => setTimeout(r, opts.entrante ? 300 : 1000));
  opts.onMessage({ tipo: "estado", valor: "llamada_iniciada" });
  later(1500, hablaEjecutivo);

  return {
    async send(msg) {
      // Cada vez que el cliente dice algo, el ejecutivo responde con la siguiente línea del guion.
      if (msg.tipo === "cliente_dice" || msg.tipo === "glosas_cliente") later(ESPERA_RESPUESTA_MS, hablaEjecutivo);
    },
    leave() {
      terminada = true;
      timers.forEach(clearTimeout);
    },
  };
}
