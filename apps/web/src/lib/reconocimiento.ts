// Lectura de señas en el celular (ADR-0002, vertical v3): cámara → MediaPipe (pose + manos) → @puente/signs → glosas.
// Modo con pausa: cada seña se reconoce al bajar las manos. Vocabulario cerrado de la demo (22 glosas, public/reco/templates.json,
// generado con lab/v5_reconocimiento/export_templates.mjs). El video NO sale del dispositivo (ADR-0010).
// TODO(offline): MediaPipe (wasm + modelos) se baja de un CDN la primera vez; para uso sin internet hay que empaquetarlo en la app.
import { createPauseRecognizer, extractFeatures, type HandsByLabel, type Pt, type TemplateSet } from "@puente/signs";

/** Se activa con NEXT_PUBLIC_RECONOCER_SENAS=1; sin eso la app sigue usando la lectura simulada. */
export const RECONOCER_SENAS = process.env.NEXT_PUBLIC_RECONOCER_SENAS === "1";

const MP = "0.10.14";
const BUNDLE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP}/vision_bundle.mjs`;
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP}/wasm`;
const MODELOS = "https://storage.googleapis.com/mediapipe-models/";

export interface OpcionesReconocedor {
  onGlosa: (glosa: string, confianza: number) => void;
  /** Terminó una seña pero no se pudo decidir entre dos glosas: conviene pedir "repite". */
  onDuda?: (a: string, b: string) => void;
  onError?: (e: unknown) => void;
}

export interface Reconocedor {
  detener(): void;
}

// Tipos mínimos de MediaPipe (se carga por URL, sin dependencia en el lockfile).
type Landmarker = { detectForVideo(v: HTMLVideoElement, t: number): Record<string, unknown> };

export async function iniciarReconocedor(video: HTMLVideoElement, o: OpcionesReconocedor): Promise<Reconocedor> {
  const set = (await (await fetch("/reco/templates.json")).json()) as TemplateSet;
  const rec = createPauseRecognizer(set);

  const mp = (await import(/* webpackIgnore: true */ BUNDLE)) as {
    FilesetResolver: { forVisionTasks(url: string): Promise<unknown> };
    PoseLandmarker: { createFromOptions(fs: unknown, opts: unknown): Promise<Landmarker> };
    HandLandmarker: { createFromOptions(fs: unknown, opts: unknown): Promise<Landmarker> };
  };
  const fs = await mp.FilesetResolver.forVisionTasks(WASM);
  const crear = async (C: { createFromOptions(fs: unknown, opts: unknown): Promise<Landmarker> }, modelo: string, extra: object) => {
    const base = { runningMode: "VIDEO", ...extra };
    try {
      return await C.createFromOptions(fs, { baseOptions: { modelAssetPath: MODELOS + modelo, delegate: "GPU" }, ...base });
    } catch {
      return await C.createFromOptions(fs, { baseOptions: { modelAssetPath: MODELOS + modelo, delegate: "CPU" }, ...base });
    }
  };
  const pose = await crear(mp.PoseLandmarker, "pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task", { numPoses: 1 });
  const manos = await crear(mp.HandLandmarker, "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", { numHands: 2 });

  let vivo = true;
  let ultimoTiempo = -1;
  let ultimaDuda: unknown = null;
  const paso = () => {
    if (!vivo) return;
    requestAnimationFrame(paso);
    if (video.readyState < 2 || video.currentTime === ultimoTiempo || !video.videoWidth) return;
    ultimoTiempo = video.currentTime;
    try {
      const ahora = performance.now();
      const pr = pose.detectForVideo(video, ahora) as { landmarks?: Pt[][] };
      const hr = manos.detectForVideo(video, ahora) as {
        landmarks?: Pt[][];
        handednesses?: { categoryName: string }[][];
        handedness?: { categoryName: string }[][];
      };
      const P = pr.landmarks?.[0];
      if (!P) return;
      const lados = hr.handednesses ?? hr.handedness ?? [];
      const H: HandsByLabel = {};
      (hr.landmarks ?? []).forEach((h, i) => {
        const lado = lados[i]?.[0]?.categoryName;
        if (lado === "Left" || lado === "Right") H[lado] = h;
      });
      const ff = extractFeatures(P, H, ahora, video.videoWidth / video.videoHeight);
      if (!ff) return;
      const r = rec.push(ff);
      if (r) { ultimaDuda = null; o.onGlosa(r.gloss, r.confidence); }
      else if (rec.dudosa && rec.dudosa !== ultimaDuda) { ultimaDuda = rec.dudosa; o.onDuda?.(rec.dudosa.a, rec.dudosa.b); }
    } catch (e) {
      o.onError?.(e);
    }
  };
  requestAnimationFrame(paso);
  return { detener() { vivo = false; } };
}
