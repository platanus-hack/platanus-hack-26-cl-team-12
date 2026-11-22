// Reconocimiento de señas en el cliente (ADR-0002, vertical v3).
// Flujo: cámara → MediaPipe (puntos clave) → ventana de N cuadros → clasificador ONNX → glosa.
// El video nunca sale del dispositivo (ADR-0010).
import { glossFromLabel } from "@puente/glosses";

/** Un cuadro de puntos clave normalizados: manos (21×2) + pose superior. */
export interface LandmarkFrame {
  timestampMs: number;
  /** [x, y, z] por punto, ya normalizados respecto a hombros (centro y escala). */
  points: Float32Array;
}

export interface Recognition {
  gloss: string;
  confidence: number;
}

export interface SignRecognizer {
  /** Agrega un cuadro; devuelve una glosa cuando detecta el fin de una seña. */
  push(frame: LandmarkFrame): Recognition | null;
  reset(): void;
}

/** Bajo este umbral la seña se marca "no reconocida" en vez de adivinar (ADR-0002). */
export const MIN_CONFIDENCE = 0.7;

export interface Classifier {
  /** Devuelve probabilidades por `classifierLabel` para una ventana de cuadros. */
  predict(window: LandmarkFrame[]): Float32Array;
}

/**
 * Reconocedor por ventana deslizante con segmentación por pausas.
 * TODO(v3): extraer puntos con @mediapipe/tasks-vision (HandLandmarker + PoseLandmarker)
 * y cargar el modelo con onnxruntime-web desde Supabase Storage (ADR-0009).
 */
export function createRecognizer(classifier: Classifier, windowSize = 30): SignRecognizer {
  let buffer: LandmarkFrame[] = [];

  return {
    push(frame) {
      buffer.push(frame);
      if (buffer.length < windowSize) return null;

      const probs = classifier.predict(buffer);
      buffer = [];

      let best = 0;
      for (let i = 1; i < probs.length; i++) if ((probs[i] ?? 0) > (probs[best] ?? 0)) best = i;
      const confidence = probs[best] ?? 0;
      const entry = glossFromLabel(best);

      // El clasificador entrega Float32Array (0.7 → 0.6999999881): comparar en la misma precisión.
      if (!entry || confidence < Math.fround(MIN_CONFIDENCE)) return null;
      return { gloss: entry.gloss, confidence };
    },
    reset() {
      buffer = [];
    },
  };
}

export * from "./plantillas";
