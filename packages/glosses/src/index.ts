// Diccionario de glosas LSCh: fuente única de verdad (ADR-0001).
// Lo consumen el clasificador (packages/signs), el reproductor de señas
// (packages/avatar) y el agente traductor (services/agent, vía el mismo JSON).
import dictionary from "../data/glosses.json";

export * from "./contract";
import { LIMITES } from "./contract";

export interface GlossEntry {
  gloss: string;
  category: string;
  es: string[];
  variants?: string[];
  classifierLabel: number;
  clip: string | null;
  animationId: string | null;
  nonManual: string | null;
  validatedBy: string | null;
  /** id en el glosario LSCh de origen (UMCE); la foto está en data/signs/img/<lexiconId>.png. */
  lexiconId?: string;
}

export interface GlossDictionary {
  version: number;
  glosses: GlossEntry[];
}

export const glossDictionary: GlossDictionary = dictionary as GlossDictionary;

const byGloss = new Map(glossDictionary.glosses.map((g) => [g.gloss, g]));
const byLabel = new Map(glossDictionary.glosses.map((g) => [g.classifierLabel, g]));

export function getGloss(gloss: string): GlossEntry | undefined {
  return byGloss.get(gloss);
}

export function glossFromLabel(label: number): GlossEntry | undefined {
  return byLabel.get(label);
}

export function isKnownGloss(gloss: string): boolean {
  return byGloss.has(gloss);
}

/** Prefijo para el deletreo manual de palabras fuera del vocabulario (ADR-0001). */
export const FINGERSPELL_PREFIX = LIMITES.deletreo.prefijo;
export const FINGERSPELL_MAX_LETTERS = LIMITES.deletreo.max_letras;
const LETRA = new RegExp(`[${LIMITES.deletreo.letras}]`, "u");

/** Prefijo para datos sin seña (horas, cifras, RUT, nombres) que el reproductor muestra como texto grande. */
export const LITERAL_PREFIX = LIMITES.literal.prefijo;
export const LITERAL_MAX_CHARS = LIMITES.literal.max_chars;
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const LITERAL_RE = new RegExp(
  `^${escapar(LITERAL_PREFIX)}[${LIMITES.literal.caracteres}]{1,${LITERAL_MAX_CHARS}}$`,
  "u",
);

/** Glosa literal válida (misma regla que el agente): `TEXTO:` + 1 a 24 caracteres permitidos. */
export function isLiteralGloss(gloss: string): boolean {
  return LITERAL_RE.test(gloss);
}

/** Texto a mostrar para una glosa literal (`TEXTO:10:30` → `10:30`). */
export function literalText(gloss: string): string {
  return gloss.slice(LITERAL_PREFIX.length);
}

/** Deletreo manual de una palabra (igual que el agente): solo letras, máx. 20; "" si no queda ninguna. */
export function fingerspell(word: string): string {
  const letras = [...word.toUpperCase()].filter((c) => LETRA.test(c)).slice(0, FINGERSPELL_MAX_LETTERS);
  return letras.length ? FINGERSPELL_PREFIX + letras.join("-") : "";
}
