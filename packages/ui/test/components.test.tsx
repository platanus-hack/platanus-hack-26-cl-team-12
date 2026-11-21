import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Subtitles, VisualAlert } from "../src/index";

describe("Subtitles", () => {
  it("anuncia líneas nuevas a lectores de pantalla", () => {
    const html = renderToStaticMarkup(<Subtitles lines={[]} />);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Subtítulos de la llamada"');
  });

  it("etiqueta quién habla y conserva el orden", () => {
    const html = renderToStaticMarkup(
      <Subtitles
        lines={[
          { id: "1", who: "ejecutivo", text: "Buenos días" },
          { id: "2", who: "cliente", text: "Quiero una hora" },
        ]}
      />,
    );
    expect(html).toContain('data-who="ejecutivo"');
    expect(html).toMatch(/Ejecutivo<\/span><span>Buenos días/);
    expect(html).toMatch(/Tú<\/span><span>Quiero una hora/);
    expect(html.indexOf("Buenos días")).toBeLessThan(html.indexOf("Quiero una hora"));
  });

  it("usa otherName y muestra la hora", () => {
    const html = renderToStaticMarkup(
      <Subtitles otherName="Recepción" lines={[{ id: "1", who: "ejecutivo", text: "Hola", time: "10:02" }]} />,
    );
    expect(html).toContain("Recepción · 10:02");
    expect(html).not.toContain("Ejecutivo");
  });

  it("muestra el original solo con showOriginal y si difiere del texto", () => {
    const lines = [
      { id: "1", who: "ejecutivo" as const, text: "Su hora es el lunes", original: "Le confirmo su hora para el lunes" },
      { id: "2", who: "ejecutivo" as const, text: "Igual", original: "Igual" },
    ];
    expect(renderToStaticMarkup(<Subtitles lines={lines} />)).not.toContain("Dijo:");
    const html = renderToStaticMarkup(<Subtitles lines={lines} showOriginal />);
    expect(html).toContain("Dijo: Le confirmo su hora para el lunes");
    expect(html).not.toContain("Dijo: Igual");
  });

  it("marca la última línea", () => {
    const html = renderToStaticMarkup(
      <Subtitles lines={[{ id: "1", who: "cliente", text: "a" }, { id: "2", who: "cliente", text: "b" }]} />,
    );
    expect(html.match(/class="pu-sub last"/g)).toHaveLength(1);
    expect(html.lastIndexOf("pu-sub last")).toBeGreaterThan(html.indexOf(">a<"));
  });

  it("escapa HTML del texto (no inyecta markup)", () => {
    const html = renderToStaticMarkup(<Subtitles lines={[{ id: "x", who: "cliente", text: "<img src=x>" }]} />);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x&gt;");
  });
});

describe("VisualAlert", () => {
  it("no renderiza nada sin mensaje", () => {
    expect(renderToStaticMarkup(<VisualAlert message={null} />)).toBe("");
    expect(renderToStaticMarkup(<VisualAlert message="" />)).toBe("");
  });

  it("usa role=alert con el mensaje y el tono", () => {
    const html = renderToStaticMarkup(<VisualAlert message="Llamada entrante" tone="incoming" />);
    expect(html).toMatch(/^<div role="alert" class="pu-alert pu-alert-incoming">/);
    expect(html).toContain('<span class="msg">Llamada entrante</span>');
  });

  it("tono por defecto notice; los tonos sin ícono usan un punto decorativo", () => {
    expect(renderToStaticMarkup(<VisualAlert message="x" />)).toContain("pu-alert-notice");
    const quiet = renderToStaticMarkup(<VisualAlert message="Llamada conectada" tone="quiet" />);
    expect(quiet).toContain('class="dot" aria-hidden="true"');
  });

  it("renderiza la acción opcional", () => {
    const html = renderToStaticMarkup(<VisualAlert message="x" action={<button>Contestar</button>} />);
    expect(html).toContain("<button>Contestar</button>");
  });
});
