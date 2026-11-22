import { expect, test } from "@playwright/test";
import { API_URL } from "../../playwright.config";
import { abrirChat, subtitulos, sugerencias, twilio } from "../helpers";

// La PWA contra la API real (services/api, levantada por e2e/api_e2e.py) por el WebSocket /twilio/cliente.
// Twilio y Claude son falsos: el test postea los webhooks de Twilio firmados y el traductor responde
// "Simple: …" (ejecutivo → cliente) y "Formal: …" (cliente → ejecutivo).
// La API tiene una sola sala (una llamada a la vez), así que estos tests van en serie.
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ request }) => {
  await request.post(`${API_URL}/e2e/reiniciar`);
});

/** Lo que Twilio dirá al ejecutivo: espera hasta que la API tenga lista la respuesta del cliente. */
async function siguienteRespuesta(request: Parameters<typeof twilio>[0]) {
  let twiml = "";
  await expect
    .poll(async () => (twiml = await twilio(request, API_URL, "/twilio/espera?n=1")), { timeout: 10_000 })
    .not.toContain("<Pause");
  return twiml;
}

test("conversación completa: la app llama, parte el cliente, los turnos alternan y cuelgan", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Llamar a mi ejecutivo/ }).click();
  await expect(page.getByRole("heading", { name: "Llamada con Mi ejecutivo del banco" })).toBeAttached();
  await expect(page.getByText("Llamando…").first()).toBeVisible();

  // La app abrió el WebSocket y pidió la llamada (POST /llamadas): la API "llamó" al número de la demo.
  await expect.poll(async () => (await request.get(`${API_URL}/e2e/llamadas`)).json()).toEqual([
    { numero: "+56900000000", base: "https://e2e.puente.test" },
  ]);

  // El ejecutivo contesta: Twilio pide el TwiML inicial y la app pasa a "En llamada". Parte la persona sorda (#40):
  // tras el saludo no se escucha al ejecutivo, se espera el primer mensaje del cliente.
  const saludo = await twilio(request, API_URL, "/twilio/voz");
  expect(saludo).toContain("/twilio/espera?n=0");
  expect(saludo).not.toContain("<Gather");
  await expect(page.getByText(/En llamada · \d/)).toBeVisible();
  await abrirChat(page);
  expect(await twilio(request, API_URL, "/twilio/espera?n=0")).toContain("<Pause"); // el cliente aún no habla

  // El cliente parte con la frase sugerida: se le dice al ejecutivo (complejizada) y recién ahí se le escucha.
  await sugerencias(page).getByRole("button", { name: "Hola, necesito hacer una consulta." }).click();
  const primera = await siguienteRespuesta(request);
  expect(primera).toContain("Formal: Hola, necesito hacer una consulta.");
  expect(primera).toContain('<Gather input="speech"');

  // Turno del ejecutivo: llega a la app simplificado, con el original y respuestas sugeridas.
  const turno = await twilio(request, API_URL, "/twilio/turno", { SpeechResult: "Su saldo es de diez mil pesos", Confidence: "0.92" });
  expect(turno).toContain("/twilio/espera?n=0");
  await expect(subtitulos(page)).toContainText("Simple: Su saldo es de diez mil pesos");
  await expect(subtitulos(page)).toContainText("Dijo: Su saldo es de diez mil pesos");
  expect(await twilio(request, API_URL, "/twilio/espera?n=0")).toContain("<Pause"); // el cliente aún no responde

  // El cliente responde con una sugerencia: Twilio se lo dice al ejecutivo (complejizado) y vuelve a escuchar.
  await sugerencias(page).getByRole("button", { name: "Sí, gracias" }).click();
  await expect(page.getByText("Banco está respondiendo")).toBeVisible();
  const dicho = await siguienteRespuesta(request);
  expect(dicho).toContain("Formal: Sí, gracias");
  expect(dicho).toContain('<Gather input="speech"');

  // Segundo turno, y el cliente responde escribiendo.
  await twilio(request, API_URL, "/twilio/turno", { SpeechResult: "Necesita algo más" });
  await expect(subtitulos(page)).toContainText("Simple: Necesita algo más");
  await page.getByPlaceholder("Escribe un mensaje").fill("Quiero el detalle por correo");
  await page.getByPlaceholder("Escribe un mensaje").press("Enter");
  expect(await siguienteRespuesta(request)).toContain("Formal: Quiero el detalle por correo");

  // El ejecutivo corta: statusCallback de Twilio → la app muestra la calificación.
  await twilio(request, API_URL, "/twilio/estado", { CallStatus: "completed" });
  await expect(page.getByRole("dialog", { name: "¿Cómo te fue con Bridge?" })).toBeVisible();
  await expect.poll(async () => (await (await request.get(`${API_URL}/e2e/clientes`)).json()).conectados).toBe(0);
});

test("colgar desde la app cierra el canal con la API", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Llamar a mi ejecutivo/ }).click();
  await expect.poll(async () => (await (await request.get(`${API_URL}/e2e/clientes`)).json()).conectados).toBe(1);
  await twilio(request, API_URL, "/twilio/voz");
  await expect(page.getByText(/En llamada · \d/)).toBeVisible();

  await page.getByRole("button", { name: "Colgar" }).click();
  await expect(page.getByRole("dialog", { name: "¿Cómo te fue con Bridge?" })).toBeVisible();
  await expect.poll(async () => (await (await request.get(`${API_URL}/e2e/clientes`)).json()).conectados).toBe(0);
});

test("si Twilio falla, la app avisa y vuelve al inicio", async ({ page, request }) => {
  await request.post(`${API_URL}/e2e/fallar?detalle=${encodeURIComponent("Twilio no configurado")}`);
  await page.goto("/");
  await page.getByRole("button", { name: /Llamar a mi ejecutivo/ }).click();

  await expect(page.getByText("No se pudo hacer la llamada (Twilio no configurado). El problema es del servidor, no de tu internet.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hola, Rafael" })).toBeVisible();
  expect(await (await request.get(`${API_URL}/e2e/llamadas`)).json()).toEqual([]);
});

test("la API rechaza webhooks de Twilio sin firma", async ({ request }) => {
  const r = await request.post(`${API_URL}/twilio/turno`, { form: { SpeechResult: "hola" } });
  expect(r.status()).toBe(403);
});
