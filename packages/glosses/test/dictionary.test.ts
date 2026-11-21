import { describe, expect, it } from "vitest";
import schema from "../schema/gloss.schema.json";
import {
  FINGERSPELL_PREFIX,
  fingerspell,
  getGloss,
  glossDictionary,
  glossFromLabel,
  isKnownGloss,
} from "../src/index";

const entrySchema = schema.properties.glosses.items;
const glossPattern = new RegExp(entrySchema.properties.gloss.pattern);
const allowedKeys = new Set(Object.keys(entrySchema.properties));

describe("glosses.json (fuente única de verdad, ADR-0001)", () => {
  const { glosses } = glossDictionary;

  it("tiene versión y al menos una glosa", () => {
    expect(Number.isInteger(glossDictionary.version)).toBe(true);
    expect(glossDictionary.version).toBeGreaterThanOrEqual(1);
    expect(glosses.length).toBeGreaterThan(0);
  });

  it("cada entrada cumple el schema", () => {
    for (const g of glosses) {
      for (const req of entrySchema.required) expect(g, `${g.gloss} sin ${req}`).toHaveProperty(req);
      for (const k of Object.keys(g)) expect(allowedKeys.has(k), `${g.gloss}: campo extra ${k}`).toBe(true);
      expect(g.gloss).toMatch(glossPattern);
      expect(g.es.length).toBeGreaterThan(0);
      expect(Number.isInteger(g.classifierLabel) && g.classifierLabel >= 0).toBe(true);
    }
  });

  it("glosas y classifierLabel son únicos", () => {
    expect(new Set(glosses.map((g) => g.gloss)).size).toBe(glosses.length);
    expect(new Set(glosses.map((g) => g.classifierLabel)).size).toBe(glosses.length);
  });

  it("las glosas caben en el tope del contrato (60 caracteres)", () => {
    for (const g of glosses) expect(g.gloss.length).toBeLessThanOrEqual(60);
  });
});

describe("búsquedas", () => {
  it("getGloss / isKnownGloss", () => {
    expect(getGloss("HOLA")?.es).toContain("hola");
    expect(getGloss("INEXISTENTE")).toBeUndefined();
    expect(isKnownGloss("HOLA")).toBe(true);
    expect(isKnownGloss("hola")).toBe(false);
  });

  it("glossFromLabel es el inverso de classifierLabel", () => {
    for (const g of glossDictionary.glosses) expect(glossFromLabel(g.classifierLabel)?.gloss).toBe(g.gloss);
    expect(glossFromLabel(99999)).toBeUndefined();
  });
});

describe("fingerspell", () => {
  it("deletrea en mayúsculas separadas por guion", () => {
    expect(fingerspell("ana")).toBe(`${FINGERSPELL_PREFIX}A-N-A`);
    expect(fingerspell("Ñuñoa")).toBe("DACTILOLOGÍA:Ñ-U-Ñ-O-A");
  });

  it("usa el mismo prefijo que el agente en Python", () => {
    expect(FINGERSPELL_PREFIX).toBe("DACTILOLOGÍA:");
  });
});
