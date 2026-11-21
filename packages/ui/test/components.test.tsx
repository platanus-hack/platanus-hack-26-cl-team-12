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
    expect(html).toContain("<strong>Ejecutivo:</strong> Buenos días");
    expect(html).toContain("<strong>Tú:</strong> Quiero una hora");
    expect(html.indexOf("Buenos días")).toBeLessThan(html.indexOf("Quiero una hora"));
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

  it("usa role=alert con el mensaje", () => {
    const html = renderToStaticMarkup(<VisualAlert message="Llamada entrante" />);
    expect(html).toBe('<div role="alert" class="puente-alert">Llamada entrante</div>');
  });
});
