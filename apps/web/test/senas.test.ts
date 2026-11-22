import { afterEach, describe, expect, it, vi } from "vitest";

// lib/senas.ts lee NEXT_PUBLIC_SENAS_URL al importarse: cada caso lo importa de nuevo con su propio entorno.
async function cargar(valor: string | undefined) {
  vi.resetModules();
  if (valor === undefined) delete process.env.NEXT_PUBLIC_SENAS_URL;
  else process.env.NEXT_PUBLIC_SENAS_URL = valor;
  return import("../src/lib/senas");
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SENAS_URL;
});

describe("fotos de señas: local o bucket S3", () => {
  it("sin variable usa las fotos locales de public/senas", async () => {
    const { SENAS_BASE, urlSena } = await cargar(undefined);
    expect(SENAS_BASE).toBe("/senas");
    expect(urlSena("hola-1.jpg")).toBe("/senas/hola-1.jpg");
  });

  it("vacía o con espacios también usa las locales", async () => {
    expect((await cargar("  ")).SENAS_BASE).toBe("/senas");
  });

  it("con la URL del bucket arma las URLs ahí, sin dobles barras", async () => {
    const { SENAS_BASE, urlSena } = await cargar("https://puente-senas.s3.us-east-2.amazonaws.com/senas/");
    expect(SENAS_BASE).toBe("https://puente-senas.s3.us-east-2.amazonaws.com/senas");
    expect(urlSena("manifest.json")).toBe("https://puente-senas.s3.us-east-2.amazonaws.com/senas/manifest.json");
  });
});
