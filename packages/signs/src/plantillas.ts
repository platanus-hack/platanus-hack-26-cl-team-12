// Reconocedor de señas AISLADAS por plantillas (DTW), con segmentación por pausa (ADR-0002: "ligera pausa entre señas").
// Flujo: MediaPipe (pose + manos) → extractFeatures() → push() por cuadro → al bajar las manos devuelve la glosa.
// Las plantillas salen de lab/v5_reconocimiento/export_templates.mjs (public/reco/templates.json). El video no sale del dispositivo (ADR-0010).
import type { Recognition } from "./index";

/** Largo del vector de rasgos por cuadro: 4 puntos de brazos (8) + 2 manos × (20 puntos × 2 + muñeca 2) = 92. */
export const FEATURE_DIM = 92;
/** Las plantillas se grabaron con una cámara 16:9; las coordenadas de MediaPipe son relativas al ancho y al alto del cuadro. */
export const TEMPLATE_ASPECT = 16 / 9;

export interface Pt { x: number; y: number; visibility?: number }
export interface HandsByLabel { Left?: Pt[]; Right?: Pt[] }

export interface FeatureFrame {
  timestampMs: number;
  /** Manos arriba (más altas que ~el codo en reposo) y al menos una mano detectada. */
  active: boolean;
  features: number[];
}

/**
 * Rasgos de un cuadro. `pose` = 33 puntos de PoseLandmarker; `hands` por lado (categoryName de HandLandmarker).
 * `aspect` = ancho/alto del video de la cámara: se corrige para que se parezca al de las plantillas (16:9).
 * Devuelve null si no se ven los hombros.
 */
export function extractFeatures(pose: Pt[], hands: HandsByLabel, timestampMs: number, aspect = TEMPLATE_ASPECT): FeatureFrame | null {
  const ls = pose[11], rs = pose[12];
  if (!ls || !rs || (ls.visibility ?? 1) < 0.3 || (rs.visibility ?? 1) < 0.3) return null;
  const k = aspect / TEMPLATE_ASPECT;
  const X = (p: Pt) => p.x * k;
  const P = (i: number): Pt => pose[i] ?? ls;
  const cx = (X(ls) + X(rs)) / 2, cy = (ls.y + rs.y) / 2;
  const sw = Math.hypot(X(ls) - X(rs), ls.y - rs.y) || 0.2;
  const f: number[] = [];
  for (const i of [13, 14, 15, 16]) f.push((X(P(i)) - cx) / sw, (P(i).y - cy) / sw);
  for (const side of ["Left", "Right"] as const) {
    const h = hands[side];
    if (!h || h.length < 21) { for (let i = 0; i < 42; i++) f.push(0); continue; }
    const H = (i: number): Pt => h[i] ?? { x: 0, y: 0 };
    const w = H(0), sc = Math.hypot(X(H(9)) - X(w), H(9).y - w.y) || 0.05;
    for (let i = 1; i < 21; i++) f.push(((X(H(i)) - X(w)) / sc) * 0.5, ((H(i).y - w.y) / sc) * 0.5);
    f.push((X(w) - cx) / sw, (w.y - cy) / sw);
  }
  const muneca = Math.min(P(15).y, P(16).y);
  const active = (hands.Left !== undefined || hands.Right !== undefined) && muneca < cy + 1.3 * sw;
  return { timestampMs, active, features: f };
}

export interface TemplateSet {
  version: number; nT: number; dim: number; aspect: number;
  /** Una seña se acepta si (mejor distancia / segunda mejor) < margen. */
  margen: number;
  templates: { gloss: string; t: number[] }[];
}

function resample(S: number[][], n: number): number[][] {
  const o: number[][] = [];
  for (let i = 0; i < n; i++) {
    const t = (i * (S.length - 1)) / (n - 1), a = Math.floor(t), b = Math.min(a + 1, S.length - 1), u = t - a;
    const A = S[a] ?? [], B = S[b] ?? A;
    o.push(A.map((x, k) => x * (1 - u) + (B[k] ?? x) * u));
  }
  return o;
}
const dist = (a: ArrayLike<number>, b: ArrayLike<number>) => { let s = 0; for (let k = 0; k < a.length; k++) { const x = (a[k] ?? 0) - (b[k] ?? 0); s += x * x; } return Math.sqrt(s); };

/** DTW con banda (30 %), normalizado por el largo de ambas secuencias. */
export function dtw(A: ArrayLike<number>[], B: ArrayLike<number>[]): number {
  const n = A.length, m = B.length, w = Math.ceil(Math.max(n, m) * 0.3), INF = 1e9, W = m + 1;
  const D = new Float64Array((n + 1) * W).fill(INF);
  D[0] = 0;
  for (let i = 1; i <= n; i++)
    for (let j = Math.max(1, i - w); j <= Math.min(m, i + w); j++) {
      const d = dist(A[i - 1] as ArrayLike<number>, B[j - 1] as ArrayLike<number>);
      D[i * W + j] = d + Math.min(D[(i - 1) * W + j] as number, D[i * W + j - 1] as number, D[(i - 1) * W + j - 1] as number);
    }
  return (D[n * W + m] as number) / (n + m);
}

export interface PauseOptions {
  /** Pausa (manos abajo) que cierra una seña. */
  pausaMs?: number;
  /** Cuadros mínimos con manos arriba para considerar una seña (descarta saludos al aire y ruido). */
  minCuadros?: number;
  /** La misma glosa no se repite antes de este tiempo (una seña larga a veces se parte en dos al bajar un poco las manos). */
  sinRepetirMs?: number;
  /** Glosas permitidas (vocabulario de la demo). Por defecto, todas las de las plantillas. */
  permitidas?: Set<string>;
}

export interface PauseRecognizer {
  /** Un cuadro por llamada. Devuelve la glosa cuando una seña termina (manos abajo) y se reconoce con seguridad. */
  push(frame: FeatureFrame): Recognition | null;
  /** Última seña terminada que NO se pudo reconocer con seguridad (para pedir "repite"): mejor y segunda opción. */
  readonly dudosa: { a: string; b: string } | null;
  reset(): void;
}

export function createPauseRecognizer(set: TemplateSet, opts: PauseOptions = {}): PauseRecognizer {
  const { pausaMs = 450, minCuadros = 10, sinRepetirMs = 1500 } = opts;
  const { nT, dim } = set;
  const plantillas = set.templates
    .filter((p) => !opts.permitidas || opts.permitidas.has(p.gloss))
    .map((p) => {
      const t: number[][] = [];
      for (let i = 0; i < nT; i++) t.push(p.t.slice(i * dim, (i + 1) * dim));
      return { gloss: p.gloss, t };
    });
  let buf: number[][] = [];
  let ultimoActivo = 0;
  let dudosa: { a: string; b: string } | null = null;
  let ultima: { gloss: string; t: number } | null = null;

  function clasificar(seg: number[][]): Recognition | null {
    const q = resample(seg, nT), mejor = new Map<string, number>();
    for (const p of plantillas) {
      const d = dtw(q, p.t);
      if (!mejor.has(p.gloss) || d < (mejor.get(p.gloss) as number)) mejor.set(p.gloss, d);
    }
    const r = [...mejor.entries()].sort((x, y) => x[1] - y[1]);
    const [primera, segunda] = r;
    if (!primera || !segunda) return null;
    const ratio = primera[1] / segunda[1];
    if (ratio < set.margen) { dudosa = null; return { gloss: primera[0], confidence: Math.max(0, 1 - ratio) }; }
    dudosa = { a: primera[0], b: segunda[0] };
    return null;
  }

  return {
    push(frame) {
      if (frame.active) { buf.push(frame.features); ultimoActivo = frame.timestampMs; return null; }
      if (buf.length && frame.timestampMs - ultimoActivo > pausaMs) {
        const seg = buf; buf = [];
        const r = seg.length >= minCuadros ? clasificar(seg) : null;
        if (!r) return null;
        if (ultima && ultima.gloss === r.gloss && frame.timestampMs - ultima.t < sinRepetirMs) return null;
        ultima = { gloss: r.gloss, t: frame.timestampMs };
        return r;
      }
      return null;
    },
    get dudosa() { return dudosa; },
    reset() { buf = []; dudosa = null; ultima = null; },
  };
}
