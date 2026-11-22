// Llamada simulada (?mock=1): reemplaza al servidor (services/api) para probar la app sin backend.
// Se comporta igual que joinCall (misma interfaz CallHandle y mismos mensajes del contrato),
// así que la pantalla no sabe si la llamada es real o de mentira.
// Hay un guion por tipo de llamada. Las glosas del de urgencia son las que tienen animación del avatar 3D
// (data/signs/anim, grabadas por Tomás); en los otros se usan las que existen y el resto se omite.
// TODO(real-data): las glosas las genera el agente (espanol_a_glosas) en la llamada real.
import type { MensajePuente } from "@puente/glosses";
import type { CallHandle } from "./call";

export type TipoGuion = "urgencia" | "banco" | "hora" | "general";

interface Turno {
  texto: string; // lo que "dice" el ejecutivo, tal cual
  simple: string; // la versión simple (v2)
  glosas: string[]; // lo que el avatar hace en señas (v4)
  opciones?: string[]; // respuestas sugeridas (modo chat) y lo que "reconoce" la cámara al responder con señas
}

/** Lo primero que la persona dice en cada tipo de llamada (en ?mock=1 habla primero el cliente). */
export const FRASE_INICIAL: Record<TipoGuion, string> = {
  urgencia: "Hola, necesito una ambulancia. Mi hijo se cayó y se quebró el codo.",
  banco: "Hola, quiero bloquear mi tarjeta porque la perdí.",
  hora: "Hola, quiero pedir una hora con medicina general.",
  general: "Hola, necesito hacer una consulta.",
};

const GUIONES: Record<TipoGuion, Turno[]> = {
  // Guion 1 de la demo (Rafael, 21-11-2026): un papá sordo llama porque su hijo se cayó.
  urgencia: [
    {
      texto: "Hola, ¿su hijo está consciente y respira bien?",
      simple: "¿Su hijo está despierto?\n¿Respira bien?",
      glosas: ["HOLA", "HIJO", "DESPERTAR-SE", "RESPIRAR", "BIEN"],
      opciones: ["Sí, está consciente, pero no puede apoyar el codo y el brazo está muy hinchado."],
    },
    {
      texto: "Entendido. ¿Hay sangrado o el brazo se ve pálido o frío?",
      simple: "¿Sale sangre?\n¿El brazo está pálido o frío?",
      glosas: ["ENTENDER", "SANGRE", "BRAZO", "PÁLIDO", "FRÍO"],
      opciones: ["Hay un poco de sangre, pero el brazo está normal. Necesito un traslado urgente."],
    },
    {
      texto: "Registramos la solicitud de ambulancia. Tenemos su dirección, señor, vamos en camino. Mientras llega, no mueva el brazo ni el codo de su hijo.",
      simple: "La ambulancia va en camino.\nYa tenemos su dirección.\nNo mueva el brazo ni el codo de su hijo.",
      glosas: ["SOLICITUD", "AMBULANCIA", "DOMICILIO", "TENER", "CAMINO", "BRAZO", "CODO", "QUIETO"],
      opciones: ["Gracias", "Repita, por favor"],
    },
  ],
  banco: [
    {
      texto: "Buenas tardes, le habla Matías. Para ayudarle necesito validar su identidad. ¿Me indica su RUT?",
      simple: "Hola. Para ayudarle,\n¿cuál es su RUT?",
      glosas: ["HOLA", "NECESITAR", "ENTENDER"],
      opciones: ["Mi RUT es 12.345.678-9"],
    },
    {
      texto: "Gracias. Ya bloqueamos su tarjeta terminada en 4321. ¿Desea que le enviemos una nueva a su domicilio?",
      simple: "Ya bloqueamos su tarjeta.\n¿Le enviamos una nueva a su casa?",
      glosas: ["BIEN", "DOMICILIO", "VENIR"],
      opciones: ["Sí, por favor", "No, gracias"],
    },
    {
      texto: "Perfecto, la tarjeta nueva llegará en cinco días hábiles. ¿Hay algo más en que le pueda ayudar?",
      simple: "La tarjeta nueva llega en 5 días.\n¿Necesita algo más?",
      glosas: ["BIEN", "ESPERAR", "NECESITAR"],
      opciones: ["No, eso es todo. Gracias"],
    },
    { texto: "Gracias a usted, que tenga buena tarde.", simple: "Gracias.\nQue le vaya bien.", glosas: ["GRACIAS"] },
  ],
  hora: [
    {
      texto: "Claro. Tengo disponibilidad con medicina general el lunes 24 a las diez de la mañana. ¿Le acomoda?",
      simple: "Hay hora el lunes 24 a las 10:00.\n¿Le sirve?",
      glosas: ["MEDICO", "TENER", "BIEN"],
      opciones: ["Sí, me sirve", "¿Tiene algo más tarde?"],
    },
    {
      texto: "Listo, quedó reservada. ¿Me confirma su RUT para dejarla a su nombre?",
      simple: "Listo.\n¿Cuál es su RUT?",
      glosas: ["BIEN", "NECESITAR"],
      opciones: ["Mi RUT es 12.345.678-9"],
    },
    {
      texto: "Perfecto, su hora quedó confirmada. Recuerde llegar quince minutos antes con su carnet.",
      simple: "Su hora quedó lista.\nLlegue 15 minutos antes con su carnet.",
      glosas: ["BIEN", "IR", "ESPERAR"],
      opciones: ["Gracias"],
    },
    { texto: "Que tenga un buen día.", simple: "Que le vaya bien.", glosas: ["GRACIAS"] },
  ],
  general: [
    {
      texto: "Hola, buenas tardes. ¿En qué le puedo ayudar?",
      simple: "Hola.\n¿En qué le ayudo?",
      glosas: ["HOLA", "NECESITAR"],
      opciones: ["Quiero saber el estado de mi trámite"],
    },
    {
      texto: "Claro. Su trámite está en revisión y estará listo el viernes. Le llegará un correo cuando esté disponible.",
      simple: "Su trámite está en revisión.\nEstará listo el viernes.",
      glosas: ["ESPERAR", "BIEN"],
      opciones: ["Gracias", "Repita, por favor"],
    },
    { texto: "Gracias a usted, que tenga buen día.", simple: "Gracias.\nQue le vaya bien.", glosas: ["GRACIAS"] },
  ],
};

const ESPERA_RESPUESTA_MS = 2000; // lo que "tarda" el ejecutivo en contestar
const PIDE_REPETIR = /repit|otra vez|no entend/i;

export async function joinMockCall(opts: { onMessage: (m: MensajePuente) => void; guion?: TipoGuion }): Promise<CallHandle> {
  const GUION = GUIONES[opts.guion ?? "general"];
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

  // Simula lo que tarda en conectar y que contesten. Habla primero la persona sorda.
  await new Promise((r) => setTimeout(r, 1000));
  opts.onMessage({ tipo: "estado", valor: "llamada_iniciada" });

  return {
    async send(msg) {
      // Si el cliente pide que repita, repite; si no, el ejecutivo dice la siguiente línea del guion.
      if (msg.tipo === "cliente_dice") later(ESPERA_RESPUESTA_MS, PIDE_REPETIR.test(msg.texto) ? repetir : siguiente);
      if (msg.tipo === "glosas_cliente") later(ESPERA_RESPUESTA_MS, siguiente);
    },
    leave() {
      terminada = true;
      timers.forEach(clearTimeout);
    },
  };
}
