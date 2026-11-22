import { describe, expect, it } from "vitest";
import { msVoz, tiemposPalabras } from "../src/lib/voz";

describe("voz: ritmo para mostrar el texto a la par del audio", () => {
  it("cada palabra se dice después de la anterior, la primera al empezar", () => {
    const t = tiemposPalabras("Hola, necesito una ambulancia. Mi hijo se cayó.");
    expect(t[0]).toBe(0);
    expect(t.length).toBe(8);
    expect(t.every((x, i) => i === 0 || x > (t[i - 1] ?? 0))).toBe(true);
  });

  it("la última palabra empieza antes de que termine la frase", () => {
    const f = "Hay un poco de sangre, pero la mano está normal.";
    expect(tiemposPalabras(f).at(-1) ?? 0).toBeLessThan(msVoz(f));
  });

  it("la puntuación agrega una pausa", () => {
    expect(msVoz("hola, mundo")).toBeGreaterThan(msVoz("hola  mundo"));
  });

  it("texto vacío: sin palabras", () => {
    expect(tiemposPalabras("   ")).toEqual([]);
  });
});
