// Diccionario de glosas LSCh: fuente única de verdad (ADR-0001).
// Lo consumen el clasificador (packages/signs), el reproductor de señas
// (packages/avatar) y el agente traductor (services/agent, vía el mismo JSON).
import dictionary from "../data/glosses.json";

export * from "./contract";

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
export const FINGERSPELL_PREFIX = "DACTILOLOGÍA:";

export function fingerspell(word: string): string {
  return FINGERSPELL_PREFIX + word.toUpperCase().split("").join("-");
}
