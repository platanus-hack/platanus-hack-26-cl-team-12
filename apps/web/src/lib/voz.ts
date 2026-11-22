// Ritmo de la voz que le habla al otro lado de la llamada (TTS en español chileno).
// La app muestra la frase convertida escrita a la par del audio, así que necesita saber cuándo se dice cada palabra.
// Es una estimación: ~14 caracteres por segundo, con una pausa corta en la puntuación. Se ajusta aquí si la voz real es más lenta o rápida.

export const MS_VOZ_POR_CARACTER = 70;
export const MS_VOZ_PAUSA = 160;

/** Instante (ms desde que empieza a sonar la frase) en que se dice cada palabra. */
export function tiemposPalabras(texto: string): number[] {
  const t: number[] = [];
  for (const m of texto.matchAll(/\S+/g)) {
    const antes = texto.slice(0, m.index).match(/[.,;:?!¿¡]/g)?.length ?? 0;
    t.push((m.index ?? 0) * MS_VOZ_POR_CARACTER + antes * MS_VOZ_PAUSA);
  }
  return t;
}

/** Cuánto dura aproximadamente decir la frase. */
export function msVoz(texto: string): number {
  const puntos = texto.match(/[.,;:?!]/g)?.length ?? 0;
  return texto.length * MS_VOZ_POR_CARACTER + puntos * MS_VOZ_PAUSA;
}
