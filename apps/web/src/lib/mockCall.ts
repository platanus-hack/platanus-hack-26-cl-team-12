// Llamada simulada (?mock=1): reemplaza al servidor (services/api) para probar la app sin backend.
// Se comporta igual que joinCall (misma interfaz CallHandle y mismos mensajes del contrato),
// así que la pantalla no sabe si la llamada es real o de mentira.
// Solo la llamada de ambulancia (la que se prueba en la demo) tiene guion completo, con las glosas que tienen
// animación del avatar 3D (data/signs/anim, grabadas por Tomás). Las demás son un ejemplo corto.
// TODO(real-data): las glosas las genera el agente (espanol_a_glosas) en la llamada real.
import type { MensajePuente } from "@puente/glosses";
import type { CallHandle } from "./call";
import { msVoz } from "./voz";

/** Lo que va pasando con la voz que simula lo que oye el hospital: cuándo parte, qué palabra dice (índice del carácter) y cuándo termina. */
export type EventoVoz = { tipo: "inicio" } | { tipo: "palabra"; charIndex: number } | { tipo: "fin"; ms: number };

export type TipoGuion = "urgencia" | "general";

interface Turno {
  texto: string; // lo que "dice" el ejecutivo, tal cual
  simple: string; // la versión simple (v2)
  glosas: string[]; // lo que el avatar hace en señas (v4)
  opciones?: string[]; // respuestas sugeridas (modo chat) y lo que "reconoce" la cámara al responder con señas
}

/** Lo primero que la persona dice en cada tipo de llamada (en ?mock=1 habla primero el cliente). */
export const FRASE_INICIAL: Record<TipoGuion, string> = {
  urgencia: "Hola, necesito una ambulancia. Mi hijo se cayó y se quebró el codo.",
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
  // Las demás llamadas (banco, clínica, trámites) son de ejemplo y cortas: la demo prueba la de ambulancia.
  general: [
    {
      texto: "Hola, buenas tardes. ¿En qué le puedo ayudar?",
      simple: "Hola.\n¿En qué le ayudo?",
      glosas: ["HOLA", "NECESITAR"],
      opciones: ["Necesito hacer una consulta"],
    },
    { texto: "Gracias por llamar. Esta llamada es un ejemplo.", simple: "Gracias.\nEsta llamada es un ejemplo.", glosas: ["GRACIAS"] },
  ],
};

/** Glosas que se esperan en cada respuesta del cliente (P1, P2, P3 de docs/GUION-1.md), para el mock. */
const GLOSAS_ESPERADAS: string[][] = [
  ["HOLA", "AMBULANCIA", "NECESITAR", "HIJO", "CAER-PERSONA", "CODO", "HUESO", "ROMPER"],
  ["SÍ", "HIJO", "DESPERTAR", "PERO", "BRAZO", "APOYAR", "NO-PODER", "CODO", "HINCHADO"],
  ["SANGRE", "POCO", "PERO", "MANO", "BIEN", "URGENTE", "NECESITAR", "HOSPITAL", "IR"],
];

const ESPERA_RESPUESTA_MS = 2000; // lo que "tarda" el ejecutivo en contestar
const PIDE_REPETIR = /repit|otra vez|no entend/i;

export async function joinMockCall(opts: {
  onMessage: (m: MensajePuente) => void;
  guion?: TipoGuion;
  /** Eventos de la voz simulada, para mostrar el texto exactamente a la par del audio. */
  onVoz?: (e: EventoVoz) => void;
}): Promise<CallHandle> {
  const GUION = GUIONES[opts.guion ?? "general"];
  const timers: ReturnType<typeof setTimeout>[] = [];
  let turno = 0;
  let terminada = false;

  const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

  /** Simula el audio que oye el hospital con la voz del navegador (en la llamada real lo dice Twilio). */
  function hablar(texto: string) {
    if (typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "es-CL";
    const t0 = performance.now();
    u.onstart = () => opts.onVoz?.({ tipo: "inicio" });
    u.onboundary = (e) => opts.onVoz?.({ tipo: "palabra", charIndex: e.charIndex });
    u.onend = () => opts.onVoz?.({ tipo: "fin", ms: Math.round(performance.now() - t0) });
    speechSynthesis.speak(u);
  }

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
      if (msg.tipo === "glosas_cliente") {
        // TODO(real-data): en la llamada real la API convierte las glosas con v2 y manda `cliente_dijo`.
        // Aquí se simula: si señaste casi todo lo esperado se muestra la frase del guion; si no, solo lo que señaste (nada se "autocompleta").
        const frase = turno === 0 ? FRASE_INICIAL[opts.guion ?? "general"] : GUION[turno - 1]?.opciones?.[0];
        const esperadas = (opts.guion === "urgencia" ? GLOSAS_ESPERADAS[turno] : undefined) ?? [];
        const aciertos = esperadas.filter((g) => msg.glosas.includes(g)).length;
        const completa = esperadas.length > 0 && aciertos / esperadas.length >= 0.7;
        const texto = completa && frase ? frase : msg.glosas.join(" ").toLowerCase();
        // Como en la llamada real: la frase llega a la app justo cuando empieza a sonar. Aquí suena con la voz del navegador.
        later(700, () => {
          opts.onMessage({ tipo: "cliente_dijo", texto });
          hablar(texto);
        });
        later(700 + msVoz(texto) + ESPERA_RESPUESTA_MS, siguiente); // el hospital contesta cuando terminó de oír
      }
    },
    leave() {
      terminada = true;
      timers.forEach(clearTimeout);
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    },
  };
}
