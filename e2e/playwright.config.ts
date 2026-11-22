import { defineConfig, devices } from "@playwright/test";

// Tests e2e de Puente: la PWA (apps/web) en un Chromium de verdad.
//   mock   la llamada simulada (?mock=1): no necesita backend.
//   real   la PWA conectada a la API real (services/api) por el WebSocket /twilio/cliente; el test hace de Twilio.
// Puertos propios (3100 y 8765) para no chocar con `make dev` (3000 y 8000).
export const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3100);
export const API_PORT = Number(process.env.E2E_API_PORT ?? 8765);
export const API_URL = `http://127.0.0.1:${API_PORT}`;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
const CI = !!process.env.CI;
const DEV = process.env.E2E_DEV === "1";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: WEB_URL,
    locale: "es-CL",
    timezoneId: "America/Santiago",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // El service worker guardaría copias viejas entre tests.
    serviceWorkers: "block",
    // Cámara falsa: la videollamada pide getUserMedia (CamaraPropia).
    permissions: ["camera"],
    ...devices["Pixel 7"],
    launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
  },
  projects: [
    { name: "mock", testMatch: /mock\/.*\.spec\.ts/ },
    // La API tiene UNA sala global (app/llamada.py, "una sola llamada a la vez"): dos tests reales en paralelo
    // reciben los mensajes del otro. workers: 1 lo garantiza aunque se use --repeat-each o se agreguen archivos.
    { name: "real", testMatch: /real\/.*\.spec\.ts/, workers: 1 },
  ],
  webServer: [
    {
      command: `uv --directory ../services/api run uvicorn --app-dir ../../e2e api_e2e:app --host 127.0.0.1 --port ${API_PORT}`,
      url: `${API_URL}/health`,
      reuseExistingServer: !CI,
      timeout: 120_000,
      env: { E2E_WEB_ORIGIN: WEB_URL },
    },
    {
      // Por defecto, el export estático de producción (lo que se despliega): `next dev` falla al renderizar con
      // recargas concurrentes ("Unexpected end of JSON input") y vuelve inestables los tests.
      // E2E_DEV=1 usa `next dev` para iterar rápido. SKIP_AVATAR=1: sin el VRM (10 MB) la app usa el intérprete dibujado.
      command: DEV
        ? `pnpm --filter @puente/web exec next dev --hostname 127.0.0.1 --port ${WEB_PORT}`
        : `pnpm --filter @puente/web build && python3 -m http.server ${WEB_PORT} --bind 127.0.0.1 --directory ../apps/web/out`,
      url: WEB_URL,
      reuseExistingServer: !CI,
      timeout: 300_000,
      env: { NEXT_PUBLIC_API_URL: API_URL, NEXT_PUBLIC_CLIENTE_WS_TOKEN: "", SKIP_AVATAR: "1" },
    },
  ],
});
