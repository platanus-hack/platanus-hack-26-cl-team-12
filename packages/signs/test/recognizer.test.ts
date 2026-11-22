import { describe, expect, it, vi } from "vitest";
import { glossDictionary } from "@puente/glosses";
import { MIN_CONFIDENCE, createRecognizer, type Classifier, type LandmarkFrame } from "../src/index";

const frame = (t: number): LandmarkFrame => ({ timestampMs: t, points: new Float32Array(3) });
const N = glossDictionary.glosses.length;

/** Clasificador falso que devuelve `conf` para `label` y reparte el resto. */
function fakeClassifier(label: number, conf: number): Classifier & { predict: ReturnType<typeof vi.fn> } {
  return {
    predict: vi.fn(() => {
      const p = new Float32Array(N).fill((1 - conf) / Math.max(N - 1, 1));
      p[label] = conf;
      return p;
    }),
  };
}

describe("createRecognizer", () => {
  it("no predice hasta llenar la ventana", () => {
    const c = fakeClassifier(0, 0.95);
    const r = createRecognizer(c, 3);
    expect(r.push(frame(0))).toBeNull();
    expect(r.push(frame(1))).toBeNull();
    expect(c.predict).not.toHaveBeenCalled();
    const out = r.push(frame(2));
    expect(c.predict).toHaveBeenCalledTimes(1);
    expect(c.predict.mock.calls[0]?.[0]).toHaveLength(3);
    expect(out?.gloss).toBe(glossDictionary.glosses.find((g) => g.classifierLabel === 0)?.gloss);
    expect(out?.confidence).toBeCloseTo(0.95);
  });

  it("vacía el buffer después de cada predicción", () => {
    const c = fakeClassifier(1, 0.9);
    const r = createRecognizer(c, 2);
    r.push(frame(0));
    r.push(frame(1));
    expect(r.push(frame(2))).toBeNull();
    expect(r.push(frame(3))).not.toBeNull();
    expect(c.predict).toHaveBeenCalledTimes(2);
  });

  it("bajo MIN_CONFIDENCE devuelve null en vez de adivinar", () => {
    const r = createRecognizer(fakeClassifier(0, MIN_CONFIDENCE - 0.01), 1);
    expect(r.push(frame(0))).toBeNull();
  });

  it("acepta exactamente MIN_CONFIDENCE aunque Float32Array lo redondee hacia abajo", () => {
    // Float32Array guarda 0.7 como 0.6999999881: el umbral debe compararse en la misma precisión.
    const r = createRecognizer(fakeClassifier(0, MIN_CONFIDENCE), 1);
    expect(r.push(frame(0))).not.toBeNull();
  });

  it("devuelve null si la etiqueta no existe en el diccionario", () => {
    const probs = new Float32Array(N + 5);
    probs[N + 4] = 0.99;
    const r = createRecognizer({ predict: () => probs }, 1);
    expect(r.push(frame(0))).toBeNull();
  });

  it("reset descarta cuadros acumulados", () => {
    const c = fakeClassifier(0, 0.9);
    const r = createRecognizer(c, 2);
    r.push(frame(0));
    r.reset();
    expect(r.push(frame(1))).toBeNull();
    expect(c.predict).not.toHaveBeenCalled();
  });

  it("usa ventana de 30 cuadros por defecto", () => {
    const c = fakeClassifier(0, 0.9);
    const r = createRecognizer(c);
    for (let i = 0; i < 29; i++) expect(r.push(frame(i))).toBeNull();
    expect(r.push(frame(29))).not.toBeNull();
  });
});
