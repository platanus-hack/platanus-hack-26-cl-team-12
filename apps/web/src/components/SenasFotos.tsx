"use client";

// Reproductor de señas con fotos del Diccionario LSCh (UMCE). D5.
// Muestra cada glosa en orden; si la seña tiene 2 o 3 fotos (inicio y fin del movimiento), las alterna.
// `TEXTO:<dato>` (hora, cifra, nombre) y las glosas sin foto se muestran como palabra grande.
// Las fotos se generan con apps/web/scripts/extraer_senas.py (no se versionan: derechos UMCE) y se sirven desde
// public/senas o desde un bucket S3 (NEXT_PUBLIC_SENAS_URL, ver lib/senas.ts).
// Si no están, useManifestSenas() devuelve null y la app muestra el intérprete dibujado.
import { useEffect, useState } from "react";
import { isLiteralGloss, literalText } from "@puente/glosses";
import { urlSena } from "@/lib/senas";

export type ManifestSenas = Record<string, string[]>;

const MS_POR_FOTO = 750; // cada foto de una seña
const MS_PAUSA = 250; // entre una seña y la siguiente (ADR-0003: 150 a 250 ms)
const MS_PALABRA = 1100; // glosa sin foto o TEXTO:

/** Carga manifest.json de las fotos una vez. null = no hay fotos (ni locales ni en el bucket). */
export function useManifestSenas(): ManifestSenas | null {
  const [m, setM] = useState<ManifestSenas | null>(null);
  useEffect(() => {
    let vivo = true;
    fetch(urlSena("manifest.json"))
      .then((r) => (r.ok ? r.json() : null))
      .then((j: ManifestSenas | null) => vivo && setM(j && Object.keys(j).length ? j : null))
      .catch(() => vivo && setM(null));
    return () => {
      vivo = false;
    };
  }, []);
  return m;
}

interface Props {
  manifest: ManifestSenas;
  /** Para reiniciar la secuencia con una frase nueva, quien lo usa cambia la `key` del componente. */
  glosas: string[];
  onSenando?: (senando: boolean) => void;
}

export function SenasFotos({ manifest, glosas, onSenando }: Props) {
  const [paso, setPaso] = useState({ i: 0, foto: 0, pausa: false });
  const fotosDe = (g?: string) => (g && !isLiteralGloss(g) ? manifest[g] ?? [] : []);

  const glosa = glosas[paso.i];
  const fotos = fotosDe(glosa);
  const terminado = paso.i >= glosas.length;

  useEffect(() => {
    onSenando?.(!terminado && glosas.length > 0);
  }, [terminado, glosas.length, onSenando]);

  useEffect(() => {
    if (terminado) return;
    if (paso.pausa) {
      const id = setTimeout(() => setPaso((p) => ({ i: p.i + 1, foto: 0, pausa: false })), MS_PAUSA);
      return () => clearTimeout(id);
    }
    const hayOtraFoto = paso.foto < fotos.length - 1;
    const id = setTimeout(
      () => setPaso((p) => (hayOtraFoto ? { ...p, foto: p.foto + 1 } : { ...p, pausa: true })),
      fotos.length ? MS_POR_FOTO : MS_PALABRA,
    );
    return () => clearTimeout(id);
  }, [paso, fotos.length, terminado]);

  // Al terminar se queda en la última foto de la última seña.
  const visible = terminado ? glosas[glosas.length - 1] : glosa;
  const fotosVisibles = fotosDe(visible);
  const archivo = terminado ? fotosVisibles[fotosVisibles.length - 1] : fotosVisibles[paso.foto];

  if (!visible) {
    const saludo = manifest["HOLA"]?.[0];
    return saludo ? <img className="senas-foto" src={urlSena(saludo)} alt="" /> : null;
  }
  if (archivo) {
    return <img className={paso.pausa ? "senas-foto pausa" : "senas-foto"} src={urlSena(archivo)} alt={`Seña ${visible}`} />;
  }
  return (
    <div className="senas-palabra" role="img" aria-label={visible}>
      {isLiteralGloss(visible) ? literalText(visible) : visible}
    </div>
  );
}
