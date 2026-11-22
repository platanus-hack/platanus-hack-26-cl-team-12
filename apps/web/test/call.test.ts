import { beforeEach, describe, expect, it, vi } from "vitest";

// LiveKit simulado: guardamos la última sala para disparar eventos desde el test.
const lk = vi.hoisted(() => {
  // call.ts lee la URL al importarse: fijamos el default para no depender del entorno local.
  delete process.env.NEXT_PUBLIC_API_URL;
  const state: { room: any } = { room: null };
  class Room {
    handlers: Record<string, (...a: unknown[]) => void> = {};
    connect = vi.fn(async () => {});
    disconnect = vi.fn(async () => {});
    localParticipant = { publishData: vi.fn(async () => {}) };
    constructor() {
      state.room = this;
    }
    on(ev: string, fn: (...a: unknown[]) => void) {
      this.handlers[ev] = fn;
      return this;
    }
  }
  return { state, Room };
});

vi.mock("livekit-client", () => ({
  Room: lk.Room,
  RoomEvent: { DataReceived: "dataReceived" },
  ParticipantKind: { STANDARD: 0, AGENT: 4 },
}));

import { joinCall } from "../src/lib/call";

const AGENT = { kind: 4 };
const HUMANO = { kind: 0 };
const enc = (o: unknown) => new TextEncoder().encode(JSON.stringify(o));

function mockToken(ok = true) {
  const fetchMock = vi.fn(async () => ({
    ok,
    status: ok ? 200 : 503,
    json: async () => ({ url: "wss://lk.test", token: "jwt" }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  lk.state.room = null;
});

describe("joinCall", () => {
  it("pide token por POST sin enviar cuerpo y se conecta", async () => {
    const fetchMock = mockToken();
    await joinCall({ onMessage: () => {} });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/token", { method: "POST" });
    expect(lk.state.room.connect).toHaveBeenCalledWith("wss://lk.test", "jwt");
  });

  it("falla si /token responde error", async () => {
    mockToken(false);
    await expect(joinCall({ onMessage: () => {} })).rejects.toThrow("token 503");
  });

  it("entrega mensajes del agente y descarta los inválidos", async () => {
    mockToken();
    const onMessage = vi.fn();
    await joinCall({ onMessage });
    const emit = lk.state.room.handlers.dataReceived;

    emit(enc({ tipo: "ejecutivo_dice", texto: "Hola" }), AGENT);
    emit(new TextEncoder().encode("basura"), AGENT);
    emit(enc({ tipo: "estado", valor: "inventado" }), AGENT);

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage.mock.calls[0]?.[0]).toMatchObject({ tipo: "ejecutivo_dice", texto: "Hola" });
  });

  it("ignora tipos SOLO_AGENTE enviados por otro participante (anti suplantación)", async () => {
    mockToken();
    const onMessage = vi.fn();
    await joinCall({ onMessage });
    const emit = lk.state.room.handlers.dataReceived;

    emit(enc({ tipo: "ejecutivo_dice", texto: "falso" }), HUMANO);
    emit(enc({ tipo: "estado", valor: "llamada_terminada" }), undefined);
    emit(enc({ tipo: "glosas_para_senar", glosas: ["HOLA"], subtitulo: "x" }), HUMANO);
    expect(onMessage).not.toHaveBeenCalled();

    // Los tipos que sí puede mandar un humano pasan.
    emit(enc({ tipo: "cliente_dice", texto: "hola" }), HUMANO);
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it("send publica JSON confiable y leave desconecta", async () => {
    mockToken();
    const call = await joinCall({ onMessage: () => {} });
    await call.send({ tipo: "cliente_dice", texto: "hola" });
    const [payload, opts] = lk.state.room.localParticipant.publishData.mock.calls[0];
    expect(JSON.parse(new TextDecoder().decode(payload))).toEqual({ tipo: "cliente_dice", texto: "hola" });
    expect(opts).toEqual({ reliable: true });
    call.leave();
    expect(lk.state.room.disconnect).toHaveBeenCalled();
  });
});
