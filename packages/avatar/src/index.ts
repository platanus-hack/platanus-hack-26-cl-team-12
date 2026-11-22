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
  /** Cada play() tiene su generación: si cambió, esa secuencia quedó obsoleta y debe salir. */
  private generation = 0;
  /** Corta la espera en curso (fin de clip o pausa entre señas). */
  private cancelWait: (() => void) | null = null;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly opts: ClipPlayerOptions,
  ) {}

  async play(glosses: string[]): Promise<void> {
    this.interrupt(); // un play() nuevo reemplaza al anterior en vez de mezclarse con él
    const gen = this.generation;
    const vigente = () => gen === this.generation;

    for (const gloss of glosses) {
      if (!vigente()) return;
      const clip = getGloss(gloss)?.clip;
      if (!clip) continue; // TODO(v4): deletreo manual cuando no hay clip
      this.video.src = `${this.opts.baseUrl}/${clip}`;
      await this.video.play();
      if (!vigente()) return;
      await this.wait((done) => {
        this.video.onended = done;
        return () => {
          if (this.video.onended === done) this.video.onended = null;
        };
      });
      if (!vigente()) return;
      await this.wait((done) => {
        const t = setTimeout(done, this.opts.gapMs ?? 200);
        return () => clearTimeout(t);
      });
    }
  }

  stop(): void {
    this.interrupt();
    this.video.pause(); // pause() no emite `ended`: por eso interrupt() resuelve la espera pendiente
  }

  private interrupt(): void {
    this.generation++;
    this.cancelWait?.();
  }

  /** Espera cancelable: resuelve cuando `start` llama a `done` o cuando se interrumpe. */
  private wait(start: (done: () => void) => () => void): Promise<void> {
    return new Promise<void>((resolve) => {
      let cleanup: (() => void) | undefined;
      const done = () => {
        if (this.cancelWait === done) this.cancelWait = null;
        cleanup?.();
        resolve();
      };
      this.cancelWait = done;
      cleanup = start(done);
    });
  }
}
