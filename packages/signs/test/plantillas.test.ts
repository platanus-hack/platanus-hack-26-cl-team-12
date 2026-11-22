import { describe, expect, it } from "vitest";
import { FEATURE_DIM, createPauseRecognizer, dtw, extractFeatures, type FeatureFrame, type TemplateSet } from "../src/index";

const NT = 24;
/** Seña sintética: un rasgo sube de 0 a `amp` con distinta forma según `kind`. */
const sena = (kind: number, n: number): number[][] =>
  Array.from({ length: n }, (_, i) => {
    const u = i / (n - 1), v = new Array(FEATURE_DIM).fill(0);
    v[0] = kind === 0 ? u : 1 - u;
    v[1] = kind === 1 ? Math.sin(u * Math.PI) : 0;
    return v;
  });
const plantilla = (gloss: string, kind: number) => {
  const s = sena(kind, NT);
  return { gloss, t: s.flat() };
};
const set: TemplateSet = {
  version: 1, nT: NT, dim: FEATURE_DIM, aspect: 16 / 9, margen: 0.96,
  templates: [plantilla("HOLA", 0), plantilla("HOLA", 0), plantilla("ADIÓS", 1), plantilla("ADIÓS", 1)],
};
const cuadros = (s: number[][], t0: number, dt = 33): FeatureFrame[] =>
  s.map((features, i) => ({ timestampMs: t0 + i * dt, active: true, features }));
const reposo = (t0: number, n = 20, dt = 33): FeatureFrame[] =>
  Array.from({ length: n }, (_, i) => ({ timestampMs: t0 + i * dt, active: false, features: new Array(FEATURE_DIM).fill(0) }));
const correr = (rec: ReturnType<typeof createPauseRecognizer>, fr: FeatureFrame[]) => fr.map((f) => rec.push(f)).filter(Boolean);

describe("createPauseRecognizer", () => {
  it("reconoce una seña al bajar las manos, aunque dure distinto que la plantilla", () => {
    const rec = createPauseRecognizer(set);
    const out = correr(rec, [...cuadros(sena(0, 40), 0), ...reposo(1400)]);
    expect(out).toHaveLength(1);
    expect(out[0]?.gloss).toBe("HOLA");
  });

  it("reconoce dos señas seguidas, separadas por pausas", () => {
    const rec = createPauseRecognizer(set);
    const a = [...cuadros(sena(0, 30), 0), ...reposo(1000), ...cuadros(sena(1, 30), 2000), ...reposo(3000)];
    expect(correr(rec, a).map((r) => r?.gloss)).toEqual(["HOLA", "ADIÓS"]);
  });

  it("no emite nada mientras las manos siguen arriba ni con movimientos muy cortos", () => {
    const rec = createPauseRecognizer(set);
    expect(correr(rec, cuadros(sena(0, 40), 0))).toHaveLength(0);
    const rec2 = createPauseRecognizer(set);
    expect(correr(rec2, [...cuadros(sena(0, 5), 0), ...reposo(500)])).toHaveLength(0);
  });

  it("respeta el vocabulario permitido", () => {
    const rec = createPauseRecognizer(set, { permitidas: new Set(["HOLA", "ADIÓS"]) });
    expect(correr(rec, [...cuadros(sena(1, 30), 0), ...reposo(1000)])[0]?.gloss).toBe("ADIÓS");
  });

  it("avisa cuando duda en vez de adivinar", () => {
    const igual: TemplateSet = { ...set, templates: [plantilla("A", 0), plantilla("B", 0)] };
    const rec = createPauseRecognizer(igual);
    expect(correr(rec, [...cuadros(sena(0, 30), 0), ...reposo(1000)])).toHaveLength(0);
    expect(rec.dudosa).not.toBeNull();
  });
});

describe("dtw", () => {
  it("es 0 contra sí misma y crece con la diferencia", () => {
    const a = sena(0, 20), b = sena(1, 20);
    expect(dtw(a, a)).toBe(0);
    expect(dtw(a, b)).toBeGreaterThan(0.01);
  });
});

describe("extractFeatures", () => {
  const pose = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  pose[11] = { x: 0.4, y: 0.4, visibility: 1 }; pose[12] = { x: 0.6, y: 0.4, visibility: 1 };
  pose[15] = { x: 0.4, y: 0.3, visibility: 1 }; pose[16] = { x: 0.6, y: 0.9, visibility: 1 };
  const mano = Array.from({ length: 21 }, (_, i) => ({ x: 0.4 + i * 0.001, y: 0.3 + i * 0.002 }));

  it("devuelve FEATURE_DIM rasgos y activo con una mano arriba", () => {
    const f = extractFeatures(pose, { Left: mano }, 0);
    expect(f?.features).toHaveLength(FEATURE_DIM);
    expect(f?.active).toBe(true);
  });
  it("no está activo sin manos detectadas, y null si no se ven los hombros", () => {
    expect(extractFeatures(pose, {}, 0)?.active).toBe(false);
    expect(extractFeatures(pose.map((p) => ({ ...p, visibility: 0.1 })), { Left: mano }, 0)).toBeNull();
  });
});
