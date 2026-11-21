// Llamada simulada (?mock=1): reemplaza a LiveKit + el agente para probar la app sin backend.
// Se comporta igual que joinCall (misma interfaz CallHandle y mismos mensajes del contrato),
// así que la pantalla no sabe si la llamada es real o de mentira.
// Escenario: pedir hora al médico. TODO(real-data): glosas tomadas del escenario real cuando B lo congele.
import type { MensajePuente } from "@puente/glosses";
import type { CallHandle } from "./call";

interface Turno {
  texto: string; // lo que "dice" el ejecutivo, tal cual
  simple: string; // la versión simple (v2)
  glosas: string[]; // lo que el avatar firmaría (v4)
}

const GUION: Turno[] = [
  {
    texto: "Buenos días, Clínica Santa María, le saluda Carolina, ¿en qué la puedo ayudar?",
    simple: "Hola. Usted habla con la Clínica. ¿En qué le ayudo?",
    glosas: ["HOLA", "CLÍNICA", "AYUDAR", "QUÉ"],
  },
  {
    texto: "Perfecto. ¿Me podría indicar su RUT, por favor?",
    simple: "¿Cuál es su RUT?",
    glosas: ["RUT", "TUYO", "CUÁL"],
  },
  {
    texto: "Gracias. Tengo disponibilidad con medicina general el lunes 24 a las diez de la mañana, ¿le acomoda ese horario?",
    simple: "Tengo hora el lunes a las 10. ¿Le sirve?",
    glosas: ["LUNES", "HORA", "DIEZ", "SERVIR"],
  },
  {
    texto: "Listo, quedó agendada su hora para el lunes a las diez. Recuerde llegar quince minutos antes.",
    simple: "Listo. Su hora es el lunes a las 10. Llegue 15 minutos antes.",
    glosas: ["LISTO", "LUNES", "HORA", "LLEGAR", "ANTES"],
  },
  {
    texto: "¿La puedo ayudar en algo más?",
    simple: "¿Necesita algo más?",
    glosas: ["NECESITAR", "OTRO", "QUÉ"],
  },
  {
    texto: "Que tenga un buen día, hasta luego.",
    simple: "Que le vaya bien. Chao.",
    glosas: ["CHAO"],
  },
];

const ESPERA_RESPUESTA_MS = 2000; // lo que "tarda" el ejecutivo en contestar

export async function joinMockCall(opts: { onMessage: (m: MensajePuente) => void }): Promise<CallHandle> {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let turno = 0;
  let terminada = false;

  const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

  function hablaEjecutivo() {
    const t = GUION[turno];
    if (!t || terminada) return;
    turno += 1;
    opts.onMessage({ tipo: "ejecutivo_dice", texto: t.texto, simple: t.simple });
    opts.onMessage({ tipo: "glosas_para_senar", glosas: t.glosas, subtitulo: t.simple });
    if (turno === GUION.length) {
      later(2500, () => {
        terminada = true;
        opts.onMessage({ tipo: "estado", valor: "llamada_terminada" });
      });
    }
  }

  // Simula lo que tarda en conectar y que el ejecutivo conteste.
  await new Promise((r) => setTimeout(r, 1000));
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
