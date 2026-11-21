// Reproducción de señas para el cliente (ADR-0003, vertical v4).
// Una sola interfaz, dos implementaciones:
//   1) ClipSignPlayer — clips de video pregrabados por glosa (primero: lo más seguro para la demo).
//   2) Avatar VRM (Three.js + @pixiv/three-vrm) — TODO(v4) cuando existan animaciones.
import { getGloss } from "@puente/glosses";

export interface SignPlayer {
  /** Reproduce una secuencia de glosas en orden. Resuelve al terminar. */
  play(glosses: string[]): Promise<void>;
  stop(): void;
}

export interface ClipPlayerOptions {
  /** URL base de los clips (Supabase Storage o /public). */
  baseUrl: string;
  /** Pausa entre señas, en ms (ADR-0003: 150–250 ms). */
  gapMs?: number;
}

export class ClipSignPlayer implements SignPlayer {
  private stopped = false;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly opts: ClipPlayerOptions,
  ) {}

  async play(glosses: string[]): Promise<void> {
    this.stopped = false;
    for (const gloss of glosses) {
      if (this.stopped) return;
      const clip = getGloss(gloss)?.clip;
      if (!clip) continue; // TODO(v4): deletreo manual cuando no hay clip
      this.video.src = `${this.opts.baseUrl}/${clip}`;
      await this.video.play();
      await new Promise<void>((resolve) => {
        this.video.onended = () => resolve();
      });
      await new Promise((r) => setTimeout(r, this.opts.gapMs ?? 200));
    }
  }

  stop(): void {
    this.stopped = true;
    this.video.pause();
  }
}
