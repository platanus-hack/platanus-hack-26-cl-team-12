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

export function parseMensaje(raw: string): MensajePuente | null {
  try {
    const msg = JSON.parse(raw) as { tipo?: unknown };
    switch (msg.tipo) {
      case "ejecutivo_dice":
      case "cliente_dice":
      case "estado":
      case "glosas_cliente":
      case "glosas_para_senar":
        return msg as MensajePuente;
      default:
        return null;
    }
  } catch {
    return null;
  }
}
