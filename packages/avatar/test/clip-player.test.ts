import { afterEach, describe, expect, it, vi } from "vitest";

// El diccionario real aún no tiene clips (TODO(real-data)); lo reemplazamos por uno controlado.
vi.mock("@puente/glosses", () => {
  const clips: Record<string, string | null> = { HOLA: "hola.mp4", GRACIAS: "gracias.mp4", SIN_CLIP: null };
  return { getGloss: (g: string) => (g in clips ? { gloss: g, clip: clips[g] } : undefined) };
});

import { ClipSignPlayer } from "../src/index";

/** HTMLVideoElement mínimo: `play()` termina el clip en el siguiente tick. */
function fakeVideo() {
  const played: string[] = [];
  const video = {
    src: "",
    onended: null as null | (() => void),
    play: vi.fn(async () => {
      played.push(video.src);
      setTimeout(() => video.onended?.(), 0);
    }),
    pause: vi.fn(),
  };
  return { video, played };
}

afterEach(() => vi.useRealTimers());

describe("ClipSignPlayer", () => {
  it("reproduce los clips en orden con la URL base", async () => {
    const { video, played } = fakeVideo();
    const p = new ClipSignPlayer(video as unknown as HTMLVideoElement, { baseUrl: "/clips", gapMs: 0 });
    await p.play(["HOLA", "GRACIAS"]);
    expect(played).toEqual(["/clips/hola.mp4", "/clips/gracias.mp4"]);
  });

  it("salta glosas sin clip o desconocidas", async () => {
    const { video, played } = fakeVideo();
    const p = new ClipSignPlayer(video as unknown as HTMLVideoElement, { baseUrl: "b", gapMs: 0 });
    await p.play(["SIN_CLIP", "NO_EXISTE", "HOLA"]);
    expect(played).toEqual(["b/hola.mp4"]);
  });

  it("respeta la pausa entre señas (200 ms por defecto)", async () => {
    vi.useFakeTimers();
    const { video, played } = fakeVideo();
    const p = new ClipSignPlayer(video as unknown as HTMLVideoElement, { baseUrl: "b" });
    const done = p.play(["HOLA", "GRACIAS"]);
    await vi.advanceTimersByTimeAsync(1); // termina el primer clip
    expect(played).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(150);
    expect(played).toHaveLength(1); // aún en la pausa
    await vi.advanceTimersByTimeAsync(100);
    expect(played).toHaveLength(2);
    await vi.runAllTimersAsync();
    await done;
  });

  it("stop() pausa el video y corta la secuencia", async () => {
    const { video, played } = fakeVideo();
    const p = new ClipSignPlayer(video as unknown as HTMLVideoElement, { baseUrl: "b", gapMs: 0 });
    video.play.mockImplementationOnce(async () => {
      played.push(video.src);
      p.stop();
      setTimeout(() => video.onended?.(), 0);
    });
    await p.play(["HOLA", "GRACIAS"]);
    expect(video.pause).toHaveBeenCalled();
    expect(played).toEqual(["b/hola.mp4"]);
  });

  it("play() después de stop() vuelve a reproducir", async () => {
    const { video, played } = fakeVideo();
    const p = new ClipSignPlayer(video as unknown as HTMLVideoElement, { baseUrl: "b", gapMs: 0 });
    p.stop();
    await p.play(["HOLA"]);
    expect(played).toEqual(["b/hola.mp4"]);
  });
});
