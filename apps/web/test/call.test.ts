import { beforeEach, describe, expect, it, vi } from "vitest";

// Fijamos el entorno para no depender del local (call.ts lee estas variables al conectar).
vi.hoisted(() => {
  delete process.env.NEXT_PUBLIC_API_URL;
  delete process.env.NEXT_PUBLIC_CLIENTE_WS_TOKEN;
});

import { joinCall } from "../src/lib/call";

// Plan C de A: WebSocket /twilio/cliente de services/api.
class FakeWS {
  static ultimo: FakeWS | null = null;
  static OPEN = 1;
  readyState = 0;
  url: string;
  enviados: string[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  constructor(url: string) {
    this.url = url;
    FakeWS.ultimo = this;
  }
  send(d: string) {
    this.enviados.push(d);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  abrir() {
    this.readyState = 1;
    this.onopen?.();
  }
}

describe("joinCall", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_CLIENTE_WS_TOKEN;
    FakeWS.ultimo = null;
    vi.unstubAllGlobals();
    vi.stubGlobal("WebSocket", FakeWS);
  });

  it("se conecta a /twilio/cliente y pasa el token si está configurado", async () => {
    process.env.NEXT_PUBLIC_CLIENTE_WS_TOKEN = "clave demo";
    const p = joinCall({ onMessage: () => {} });
    FakeWS.ultimo!.abrir();
    await p;
    expect(FakeWS.ultimo!.url).toBe("ws://localhost:8000/twilio/cliente?token=clave%20demo");
  });

  it("entrega mensajes válidos, descarta basura y envía cliente_dice", async () => {
    const onMessage = vi.fn();
    const p = joinCall({ onMessage });
    const ws = FakeWS.ultimo!;
    ws.abrir();
    const call = await p;
    ws.onmessage?.({ data: JSON.stringify({ tipo: "ejecutivo_dice", texto: "Hola" }) });
    ws.onmessage?.({ data: "basura" });
    expect(onMessage).toHaveBeenCalledTimes(1);
    await call.send({ tipo: "cliente_dice", texto: "Sí" });
    expect(JSON.parse(ws.enviados[0]!)).toEqual({ tipo: "cliente_dice", texto: "Sí" });
  });

  it("avisa si se corta sin colgar, pero no cuando el usuario cuelga", async () => {
    const onDesconectado = vi.fn();
    let p = joinCall({ onMessage: () => {}, onDesconectado });
    FakeWS.ultimo!.abrir();
    await p;
    FakeWS.ultimo!.close();
    expect(onDesconectado).toHaveBeenCalledTimes(1);

    p = joinCall({ onMessage: () => {}, onDesconectado });
    FakeWS.ultimo!.abrir();
    (await p).leave();
    expect(onDesconectado).toHaveBeenCalledTimes(1);
  });

  it("falla con un mensaje claro si no puede conectar", async () => {
    const p = joinCall({ onMessage: () => {} });
    FakeWS.ultimo!.onerror?.();
    await expect(p).rejects.toThrow("no se pudo conectar con el servidor");
  });
});
