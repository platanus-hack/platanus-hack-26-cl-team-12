"use client";

// Carrusel horizontal con puntitos debajo (estilo de los posts con varias fotos).
// `porPagina`: cuántos elementos caben en una "página" (un puntito por página). Tocar un puntito lleva a esa página.
import { Children, useEffect, useRef, useState, type ReactNode } from "react";

export function Carrusel({ children, porPagina = 1, etiqueta, className = "" }: { children: ReactNode; porPagina?: number; etiqueta: string; className?: string }) {
  const pista = useRef<HTMLUListElement>(null);
  const items = Children.toArray(children);
  const paginas = Math.max(1, Math.ceil(items.length / porPagina));
  const [activa, setActiva] = useState(0);

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    const alMover = () => {
      const max = el.scrollWidth - el.clientWidth;
      setActiva(max <= 0 ? 0 : Math.round((el.scrollLeft / max) * (paginas - 1)));
    };
    el.addEventListener("scroll", alMover, { passive: true });
    return () => el.removeEventListener("scroll", alMover);
  }, [paginas]);

  function irA(p: number) {
    const el = pista.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: paginas > 1 ? (max * p) / (paginas - 1) : 0, behavior: "smooth" });
  }

  return (
    <div className={`carrusel-caja ${className}`}>
      <ul ref={pista} className="carrusel" aria-label={etiqueta}>
        {items.map((it, i) => (
          <li key={i} className="carrusel-item">
            {it}
          </li>
        ))}
      </ul>
      {paginas > 1 && (
        <div className="puntitos" role="tablist" aria-label={`Páginas de ${etiqueta}`}>
          {Array.from({ length: paginas }, (_, p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={p === activa}
              aria-label={`Página ${p + 1} de ${paginas}`}
              className={p === activa ? "puntito on" : "puntito"}
              onClick={() => irA(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
