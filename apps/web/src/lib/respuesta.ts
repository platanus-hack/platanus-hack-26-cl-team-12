import type { MensajePuente } from "@puente/glosses";

/**
 * Qué se manda al responder. Solo el botón Enviar de la cámara (`deSenas`) manda las glosas reconocidas; lo escrito
 * en el chat o elegido en las sugerencias va siempre como texto, aunque la cámara haya leído algo en este turno
 * (antes un "HOLA" espurio reemplazaba lo que escribiste y el ejecutivo oía otra cosa).
 */
export function mensajeCliente(texto: string, glosas: string[], deSenas: boolean): MensajePuente {
  return deSenas && glosas.length ? { tipo: "glosas_cliente", glosas, confianza: 1 } : { tipo: "cliente_dice", texto };
}
