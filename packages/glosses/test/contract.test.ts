import { describe, expect, it } from "vitest";
import { SOLO_AGENTE, parseMensaje } from "../src/contract";

const j = (o: unknown) => JSON.stringify(o);

describe("parseMensaje", () => {
  it("rechaza JSON inválido y valores que no son objeto", () => {
    expect(parseMensaje("no es json")).toBeNull();
    expect(parseMensaje("null")).toBeNull();
    expect(parseMensaje("[1,2]")).toBeNull();
    expect(parseMensaje('"texto"')).toBeNull();
    expect(parseMensaje(j({ tipo: "desconocido" }))).toBeNull();
    expect(parseMensaje(j({}))).toBeNull();
  });

  it("ejecutivo_dice: acepta con y sin `simple` (null = v2 apagada)", () => {
    expect(parseMensaje(j({ tipo: "ejecutivo_dice", texto: "Hola" }))).toEqual({
      tipo: "ejecutivo_dice",
      texto: "Hola",
      simple: undefined,
    });
    expect(parseMensaje(j({ tipo: "ejecutivo_dice", texto: "Hola", simple: null }))?.tipo).toBe("ejecutivo_dice");
    expect(parseMensaje(j({ tipo: "ejecutivo_dice", texto: "Hola", simple: "Hola." }))).toEqual({
      tipo: "ejecutivo_dice",
      texto: "Hola",
      simple: "Hola.",
    });
  });

  it("ejecutivo_dice: rechaza texto vacío, muy largo o `simple` inválido", () => {
    expect(parseMensaje(j({ tipo: "ejecutivo_dice", texto: "" }))).toBeNull();
    expect(parseMensaje(j({ tipo: "ejecutivo_dice", texto: "a".repeat(501) }))).toBeNull();
    expect(parseMensaje(j({ tipo: "ejecutivo_dice", texto: 3 }))).toBeNull();
    expect(parseMensaje(j({ tipo: "ejecutivo_dice", texto: "ok", simple: 5 }))).toBeNull();
    expect(parseMensaje(j({ tipo: "ejecutivo_dice", texto: "ok", simple: "" }))).toBeNull();
  });

  it("ejecutivo_dice: acepta exactamente el tope de 500 caracteres", () => {
    expect(parseMensaje(j({ tipo: "ejecutivo_dice", texto: "a".repeat(500) }))).not.toBeNull();
  });

  it("cliente_dijo: la frase en español en que se convirtió lo firmado", () => {
    expect(parseMensaje(j({ tipo: "cliente_dijo", texto: "Hola, necesito una ambulancia.", extra: 1 }))).toEqual({
      tipo: "cliente_dijo",
      texto: "Hola, necesito una ambulancia.",
    });
    expect(parseMensaje(j({ tipo: "cliente_dijo", texto: "" }))).toBeNull();
    expect(parseMensaje(j({ tipo: "cliente_dijo" }))).toBeNull();
  });

  it("cliente_dice: descarta campos extra", () => {
    expect(parseMensaje(j({ tipo: "cliente_dice", texto: "hola", role: "agente" }))).toEqual({
      tipo: "cliente_dice",
      texto: "hola",
    });
    expect(parseMensaje(j({ tipo: "cliente_dice" }))).toBeNull();
  });

  it("estado: solo valores conocidos", () => {
    expect(parseMensaje(j({ tipo: "estado", valor: "llamada_iniciada" }))).toEqual({
      tipo: "estado",
      valor: "llamada_iniciada",
    });
    expect(parseMensaje(j({ tipo: "estado", valor: "llamada_terminada" }))?.tipo).toBe("estado");
    expect(parseMensaje(j({ tipo: "estado", valor: "otro" }))).toBeNull();
  });

  it("glosas_cliente: valida lista, topes y confianza numérica", () => {
    expect(parseMensaje(j({ tipo: "glosas_cliente", glosas: ["YO", "QUERER"], confianza: 0.9 }))).toEqual({
      tipo: "glosas_cliente",
      glosas: ["YO", "QUERER"],
      confianza: 0.9,
    });
    expect(parseMensaje(j({ tipo: "glosas_cliente", glosas: [], confianza: 1 }))).toBeNull();
    expect(parseMensaje(j({ tipo: "glosas_cliente", glosas: ["YO"], confianza: "alta" }))).toBeNull();
    expect(parseMensaje(j({ tipo: "glosas_cliente", glosas: Array(31).fill("YO"), confianza: 1 }))).toBeNull();
    expect(parseMensaje(j({ tipo: "glosas_cliente", glosas: ["A".repeat(61)], confianza: 1 }))).toBeNull();
    expect(parseMensaje(j({ tipo: "glosas_cliente", glosas: [""], confianza: 1 }))).toBeNull();
    expect(parseMensaje(j({ tipo: "glosas_cliente", glosas: [1], confianza: 1 }))).toBeNull();
    expect(parseMensaje(j({ tipo: "glosas_cliente", glosas: "YO", confianza: 1 }))).toBeNull();
  });

  it("glosas_para_senar: exige subtítulo", () => {
    expect(parseMensaje(j({ tipo: "glosas_para_senar", glosas: ["HOLA"], subtitulo: "Hola" }))).toEqual({
      tipo: "glosas_para_senar",
      glosas: ["HOLA"],
      subtitulo: "Hola",
    });
    expect(parseMensaje(j({ tipo: "glosas_para_senar", glosas: ["HOLA"] }))).toBeNull();
  });
});

describe("SOLO_AGENTE", () => {
  it("contiene solo los tipos que emite el agente", () => {
    expect([...SOLO_AGENTE].sort()).toEqual(["cliente_dijo", "ejecutivo_dice", "estado", "glosas_para_senar"]);
    expect(SOLO_AGENTE.has("cliente_dice")).toBe(false);
    expect(SOLO_AGENTE.has("glosas_cliente")).toBe(false);
  });
});
