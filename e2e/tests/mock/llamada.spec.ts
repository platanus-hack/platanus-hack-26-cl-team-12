import { expect, test, type Page } from "@playwright/test";
import { abrirChat, subtitulos, sugerencias } from "../helpers";

// La llamada simulada (?mock=1, apps/web/src/lib/mockCall.ts): el guion de la ambulancia de la demo, de punta a punta.
// El "ejecutivo" contesta ~2 s después de cada respuesta y la cámara "lee" las señas en ~2,6 s.

const FRASE_URGENCIA = "Hola, necesito una ambulancia. Mi hijo se cayó y se quebró el codo.";

async function pedirAmbulancia(page: Page) {
  await page.goto("/?mock=1");
  await page.getByRole("button", { name: /Pedir una ambulancia/ }).click();
  await expect(page.getByRole("heading", { name: "Llamada con Urgencias Clínica Santa María" })).toBeAttached();
  await expect(page.getByText(/En llamada · \d/)).toBeVisible();
}

test("guion completo de la ambulancia por el chat, hasta calificar", async ({ page }) => {
  test.setTimeout(90_000);
  await pedirAmbulancia(page);
  await abrirChat(page);
  await expect(page.getByText("Compartiste tu ubicación")).toBeVisible();

  // Habla primero la persona sorda: la sugerencia es la frase del destino.
  await sugerencias(page).getByRole("button", { name: FRASE_URGENCIA }).click();
  await expect(subtitulos(page).locator('li[data-who="cliente"]').first()).toContainText(FRASE_URGENCIA);
  await expect(page.getByText("Urgencias está respondiendo")).toBeVisible();

  // Turno 1: texto simple + el original ("Dijo: …").
  await expect(subtitulos(page)).toContainText("¿Su hijo está despierto?");
  await expect(subtitulos(page)).toContainText("Dijo: Hola, ¿su hijo está consciente y respira bien?");
  await sugerencias(page).getByRole("button", { name: /Sí, está consciente/ }).click();

  // Turno 2.
  await expect(subtitulos(page)).toContainText("¿Sale sangre?");
  await sugerencias(page).getByRole("button", { name: /Hay un poco de sangre/ }).click();

  // Turno 3: "Repita, por favor" hace que el ejecutivo lo diga de nuevo.
  await expect(subtitulos(page)).toContainText("La ambulancia va en camino.");
  await sugerencias(page).getByRole("button", { name: "Repita, por favor" }).click();
  await expect(subtitulos(page).locator('li[data-who="ejecutivo"]', { hasText: "La ambulancia va en camino." })).toHaveCount(2);

  // El guion termina solo (~10 s después del último turno) y aparece la calificación.
  const calificacion = page.getByRole("dialog", { name: "¿Cómo te fue con Bridge?" });
  await expect(calificacion).toBeVisible({ timeout: 20_000 });
  await expect(calificacion).toContainText("Llamada con Urgencias Clínica Santa María");

  await expect(calificacion.getByRole("button", { name: "Enviar" })).toBeDisabled();
  await calificacion.getByRole("radio", { name: "5 de 5: Excelente" }).click();
  await expect(calificacion.getByText("¿Qué salió bien?")).toBeVisible();
  const chip = calificacion.getByRole("button", { name: "Fue rápido" });
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await calificacion.getByRole("button", { name: "Enviar" }).click();

  await expect(page.getByRole("heading", { name: "Gracias por tu opinión" })).toBeVisible();
  await page.getByRole("button", { name: "Volver al inicio" }).click();
  await expect(page.getByRole("heading", { name: "Hola, Rafael" })).toBeVisible();
});

test("responder con señas: la cámara lee y se toca Enviar", async ({ page }) => {
  await pedirAmbulancia(page);
  const enviar = page.getByRole("button", { name: /^Enviar/ });
  await expect(enviar).toBeDisabled();

  // Lectura simulada (TODO(v3) en la app): pasa a "Señas listas" y se habilita Enviar.
  await expect(page.getByText("Entendí tus señas. Toca Enviar.")).toBeVisible();
  await page.getByRole("button", { name: "Enviar lo que dijiste con señas" }).click();

  const tuCamara = page.getByRole("region", { name: "Tu cámara" });
  await expect(tuCamara).toContainText(FRASE_URGENCIA);
  await expect(page.locator(".vl-sub-ejecutivo")).toContainText("¿Su hijo está despierto?");
});

test("apagar la cámara deja responder solo por el chat", async ({ page }) => {
  await pedirAmbulancia(page);
  await page.getByRole("button", { name: "Cámara" }).click();
  await expect(page.getByText("Cámara apagada. Puedes responder en el chat.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sin cámara" })).toHaveAttribute("aria-pressed", "true");

  await abrirChat(page);
  await page.getByPlaceholder("Escribe un mensaje").fill("Mi hijo tiene 8 años");
  await page.getByRole("button", { name: "Decir" }).click();
  await expect(subtitulos(page).locator('li[data-who="cliente"]')).toContainText("Mi hijo tiene 8 años");
  await expect(subtitulos(page)).toContainText("¿Su hijo está despierto?");
});

test("colgar a una persona de Contactos y omitir la calificación", async ({ page }) => {
  await page.goto("/?mock=1");
  await page.getByRole("navigation", { name: "Secciones" }).getByRole("button", { name: "Contactos" }).click();
  await page.getByRole("button", { name: "Llamar a Ana Rencoret con Bridge" }).click();

  await expect(page.getByText("Llamando…").first()).toBeVisible();
  await expect(page.getByText(/En llamada · \d/)).toBeVisible();
  await page.getByRole("button", { name: "Colgar" }).click();

  const calificacion = page.getByRole("dialog", { name: "¿Cómo te fue con Bridge?" });
  await expect(calificacion).toContainText("Llamada con Ana Rencoret");
  await calificacion.getByRole("button", { name: "Omitir" }).click();
  await expect(page.getByRole("heading", { name: "Hola, Rafael" })).toBeVisible();
});

test("atajo del ícono (?llamar=urgencias) llama apenas abre", async ({ page }) => {
  await page.goto("/?mock=1&llamar=urgencias");
  await expect(page.getByRole("heading", { name: "Llamada con Urgencias Clínica Santa María" })).toBeAttached();
  await expect(page.getByText(/En llamada · \d/)).toBeVisible();
});
