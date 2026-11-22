import { expect, test } from "@playwright/test";
import { leerPreferencias, sembrarPreferencias } from "../helpers";

// La app fuera de una llamada: login, pestañas, buscador de contactos y tema. No necesita backend.

test.describe("login", () => {
  test.beforeEach(async ({ page }) => {
    await sembrarPreferencias(page, { sesion: null });
    await page.goto("/?mock=1");
  });

  test("pide usuario y contraseña antes de entrar", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Bridge" })).toBeVisible();
    // Next.js agrega su propio role="alert" (route announcer): se filtra por el texto del error.
    const error = page.getByRole("alert").filter({ hasText: "Escribe tu usuario y tu contraseña." });
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(error).toBeVisible();

    await page.getByLabel("Usuario o correo").fill("rafael@puente.cl");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(error).toBeVisible(); // falta la contraseña
    await expect(page.getByRole("heading", { name: "Bridge" })).toBeVisible();
  });

  test("entra con cualquier usuario y la sesión sobrevive a recargar", async ({ page }) => {
    await page.getByLabel("Usuario o correo").fill("  rafael@puente.cl  ");
    await page.getByLabel("Contraseña").fill("demo");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page.getByRole("heading", { name: "Hola, Rafael" })).toBeVisible();
    expect((await leerPreferencias(page)).sesion).toEqual({ usuario: "rafael@puente.cl" });

    await page.reload();
    await expect(page.getByRole("heading", { name: "Hola, Rafael" })).toBeVisible();
  });
});

test.describe("inicio", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?mock=1");
    await expect(page.getByRole("heading", { name: "Hola, Rafael" })).toBeVisible();
  });

  test("muestra las acciones, con la ambulancia primero", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "¿Qué necesitas hacer?" })).toBeVisible();
    const acciones = page.locator("ul.acciones button");
    await expect(acciones).toHaveCount(4);
    await expect(acciones.first()).toContainText("Pedir una ambulancia");
    await expect(page.getByRole("button", { name: "Llamar a Fonasa" })).toBeAttached();
  });

  test("las pestañas cambian de sección", async ({ page }) => {
    const tabs = page.getByRole("navigation", { name: "Secciones" });
    await tabs.getByRole("button", { name: "Historial" }).click();
    await expect(page.getByRole("heading", { name: "Historial", level: 1 })).toBeVisible();
    await expect(tabs.getByRole("button", { name: "Historial" })).toHaveAttribute("aria-current", "page");

    await tabs.getByRole("button", { name: "Contactos" }).click();
    await expect(page.getByRole("heading", { name: "Contactos", level: 1 })).toBeVisible();

    await tabs.getByRole("button", { name: "Inicio" }).click();
    await expect(page.getByRole("heading", { name: "Hola, Rafael" })).toBeVisible();
  });

  test("el buscador de contactos ignora tildes y mayúsculas", async ({ page }) => {
    await page.getByRole("navigation", { name: "Secciones" }).getByRole("button", { name: "Contactos" }).click();
    const buscar = page.getByRole("searchbox", { name: "Buscar contacto" });

    await buscar.fill("CLINICA");
    await expect(page.getByRole("button", { name: "Llamar a Clínica Santa María con Bridge" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Llamar a Fonasa con Bridge" })).toHaveCount(0);

    await buscar.fill("hermana");
    await expect(page.getByRole("button", { name: "Llamar a Ana Rencoret con Bridge" })).toBeVisible();
    await expect(page.getByText("Ninguna coincide con tu búsqueda.")).toBeVisible();

    await buscar.fill("zzz");
    await expect(page.getByText("Agrega contactos en tu perfil.")).toBeVisible();
  });

  test("el tema claro/oscuro se aplica y se recuerda", async ({ page }) => {
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");

    await page.getByRole("button", { name: "Cambiar a modo claro" }).click();
    await expect(html).toHaveAttribute("data-theme", "light");
    await expect(page.getByRole("button", { name: "Cambiar a modo oscuro" })).toBeVisible();

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "light");
    expect((await leerPreferencias(page)).tema).toBe("claro");
  });

  test("compartir ubicación se puede apagar", async ({ page }) => {
    const ubicacion = page.getByRole("button", { name: /Providencia/ });
    await expect(ubicacion).toHaveAttribute("aria-pressed", "true");
    await ubicacion.click();
    await expect(ubicacion).toHaveAttribute("aria-pressed", "false");
    await expect(ubicacion).toContainText("No compartida");
  });
});
