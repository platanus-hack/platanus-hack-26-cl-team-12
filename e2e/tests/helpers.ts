import { createHmac } from "node:crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

// Lo mismo que apps/web/src/lib/scriptTema.ts (CLAVE_PREFERENCIAS). Los e2e no importan código de la app.
const CLAVE_PREFERENCIAS = "puente-preferencias";

/** Deja preferencias guardadas antes de que cargue la app (p. ej. `{ sesion: null }` para ver el login). */
export async function sembrarPreferencias(page: Page, prefs: Record<string, unknown>) {
  await page.addInitScript(
    ([clave, valor]) => {
      // Solo la primera carga: si el test recarga, se conserva lo que guardó la app.
      if (!sessionStorage.getItem("e2e-sembrado")) {
        localStorage.setItem(clave, valor);
        sessionStorage.setItem("e2e-sembrado", "1");
      }
    },
    [CLAVE_PREFERENCIAS, JSON.stringify(prefs)] as const,
  );
}

export async function leerPreferencias(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate((clave) => JSON.parse(localStorage.getItem(clave) ?? "{}"), CLAVE_PREFERENCIAS);
}

/** Abre el chat de la llamada (botón "Chat" de los controles). */
export async function abrirChat(page: Page) {
  const chat = page.getByRole("button", { name: "Chat" });
  if ((await chat.getAttribute("aria-pressed")) !== "true") await chat.click();
}

export const sugerencias = (page: Page) => page.getByRole("group", { name: "Sugerencias" });
export const subtitulos = (page: Page) => page.getByRole("list", { name: "Subtítulos de la llamada" });

// ───────── Twilio falso (proyecto real) ─────────
// Mismos valores que e2e/api_e2e.py.
const TWILIO_AUTH_TOKEN = process.env.E2E_TWILIO_AUTH_TOKEN ?? "token-e2e";
const PUBLIC_BASE_URL = "https://e2e.puente.test";

/** X-Twilio-Signature: HMAC-SHA1 (base64) de la URL pública + cada parámetro (clave+valor) ordenado por clave. */
export function firmaTwilio(url: string, params: Record<string, string>): string {
  const datos = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  return createHmac("sha1", TWILIO_AUTH_TOKEN).update(datos, "utf8").digest("base64");
}

/** POST como lo haría Twilio a la API (firmado contra la URL pública, aunque llegue por 127.0.0.1). */
export async function twilio(request: APIRequestContext, apiUrl: string, ruta: string, params: Record<string, string> = {}) {
  const r = await request.post(apiUrl + ruta, {
    form: params,
    headers: { "X-Twilio-Signature": firmaTwilio(PUBLIC_BASE_URL + ruta, params) },
  });
  expect(r.status(), `POST ${ruta}`).toBeLessThan(300);
  return r.text();
}
