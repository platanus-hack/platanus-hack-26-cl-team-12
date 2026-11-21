// Tipos del contrato de mensajes (docs/contrato.md).
// Los tres primeros se mantienen tal como los definió el equipo; los nuevos
// viajan por data channel de LiveKit (ADR-0005).

export type EstadoLlamada = "llamada_iniciada" | "llamada_terminada";

/** El ejecutivo (persona al teléfono) habló. `simple` existe desde v2. */
export interface EjecutivoDice {
  tipo: "ejecutivo_dice";
  texto: string;
  simple?: string;
}

/** El cliente (persona sorda) escribió o firmó. v2+: el backend lo complejiza antes de hablar. */
export interface ClienteDice {
  tipo: "cliente_dice";
  texto: string;
}

export interface Estado {
  tipo: "estado";
  valor: EstadoLlamada;
}

/** Glosas reconocidas por la cámara del cliente (v3), enviadas al agente. */
export interface GlosasCliente {
  tipo: "glosas_cliente";
  glosas: string[];
  confianza: number;
}

/** Glosas que el agente manda a reproducir (v4), con subtítulo en español. */
export interface GlosasParaSenar {
  tipo: "glosas_para_senar";
  glosas: string[];
  subtitulo: string;
}

export type MensajePuente =
  | EjecutivoDice
  | ClienteDice
  | Estado
  | GlosasCliente
  | GlosasParaSenar;

/** Mensajes que solo puede emitir el agente. El cliente debe ignorarlos si vienen de otro participante. */
export const SOLO_AGENTE: ReadonlySet<MensajePuente["tipo"]> = new Set([
  "ejecutivo_dice",
  "estado",
  "glosas_para_senar",
]);

const MAX_TEXTO = 500;
const MAX_GLOSAS = 30;
const MAX_GLOSA_CHARS = 60; // "DACTILOLOGÍA:" + 20 letras separadas por guion = 52

const esTexto = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= MAX_TEXTO;
const esGlosas = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= MAX_GLOSAS &&
  v.every((g) => typeof g === "string" && g.length > 0 && g.length <= MAX_GLOSA_CHARS);

/** Valida forma y tipos de cada campo; devuelve null si el mensaje no cumple el contrato. */
export function parseMensaje(raw: string): MensajePuente | null {
  let msg: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    msg = parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  switch (msg.tipo) {
    case "ejecutivo_dice":
      if (!esTexto(msg.texto)) return null;
      // `simple` es null/ausente cuando la v2 está apagada (así lo envía la simulación del backend).
      if (msg.simple != null && !esTexto(msg.simple)) return null;
      return { tipo: "ejecutivo_dice", texto: msg.texto, simple: msg.simple ?? undefined };
    case "cliente_dice":
      return esTexto(msg.texto) ? { tipo: "cliente_dice", texto: msg.texto } : null;
    case "estado":
      return msg.valor === "llamada_iniciada" || msg.valor === "llamada_terminada"
        ? { tipo: "estado", valor: msg.valor }
        : null;
    case "glosas_cliente":
      return esGlosas(msg.glosas) && typeof msg.confianza === "number"
        ? { tipo: "glosas_cliente", glosas: msg.glosas, confianza: msg.confianza }
        : null;
    case "glosas_para_senar":
      return esGlosas(msg.glosas) && esTexto(msg.subtitulo)
        ? { tipo: "glosas_para_senar", glosas: msg.glosas, subtitulo: msg.subtitulo }
        : null;
    default:
      return null;
  }
}
