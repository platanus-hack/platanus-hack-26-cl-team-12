import { describe, expect, it } from "vitest";
import { mensajeCliente } from "../src/lib/respuesta";

describe("mensajeCliente", () => {
  it("lo escrito en el chat va como texto aunque la cámara haya leído glosas", () => {
    expect(mensajeCliente("Necesito una ambulancia", ["HOLA"], false)).toEqual({
      tipo: "cliente_dice",
      texto: "Necesito una ambulancia",
    });
  });

  it("el botón Enviar de la cámara manda las glosas", () => {
    expect(mensajeCliente("HOLA AYUDA", ["HOLA", "AYUDA"], true)).toEqual({
      tipo: "glosas_cliente",
      glosas: ["HOLA", "AYUDA"],
      confianza: 1,
    });
  });

  it("Enviar sin glosas reconocidas manda el texto", () => {
    expect(mensajeCliente("hola", [], true)).toEqual({ tipo: "cliente_dice", texto: "hola" });
  });
});
