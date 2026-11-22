// Intérprete de LSCh dibujado y personalizable (marcador de posición del reproductor real).
// Como los intérpretes reales: ropa oscura y fondo liso, para que las manos se lean bien.
// `apariencia` define estatura, contextura, piel, pelo, ojos, lentes, vello facial y ropa.
// `soloCara` dibuja solo el retrato (para la foto de perfil y el chat).
// TODO(v4): reemplazar por fotos/clips de packages/avatar cuando haya un avatar 3D.

export const TONOS_PIEL = {
  "muy-clara": ["#f6d5bd", "#e0b597"],
  clara: ["#f1c7a5", "#d9a37f"],
  media: ["#c68863", "#a96f4f"],
  morena: ["#9c6542", "#7d4d30"],
  oscura: ["#6b4128", "#4f2e1b"],
} as const;
export const COLORES_PELO = { negro: "#1d1612", castano: "#4a2f20", rubio: "#c9a15a", pelirrojo: "#9a3f1c", canoso: "#b9b9b9" } as const;
export const COLORES_OJOS = { cafe: "#4b2e1a", verde: "#3e7a3e", azul: "#3a6fb0", gris: "#7a8691", negro: "#1b1b1b" } as const;
export const COLORES_ROPA = { negro: "#1f232b", marino: "#1c2a4a", grafito: "#3a3f48", burdeo: "#5a1f2b" } as const;

export interface Apariencia {
  estatura: "baja" | "media" | "alta";
  contextura: "delgada" | "media" | "robusta";
  piel: keyof typeof TONOS_PIEL;
  largoPelo: "sin-pelo" | "corto" | "medio" | "largo" | "tomado";
  colorPelo: keyof typeof COLORES_PELO;
  ojos: keyof typeof COLORES_OJOS;
  lentes: boolean;
  vello: "ninguno" | "bigote" | "barba";
  ropa: keyof typeof COLORES_ROPA;
}

export const APARIENCIA_POR_DEFECTO: Apariencia = {
  estatura: "media",
  contextura: "media",
  piel: "media",
  largoPelo: "corto",
  colorPelo: "negro",
  ojos: "cafe",
  lentes: false,
  vello: "ninguno",
  ropa: "negro",
};

function Mano({ x, y, abierta, piel, sombra }: { x: number; y: number; abierta: boolean; piel: string; sombra: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-16} y={-20} width={32} height={34} rx={13} fill={piel} />
      {abierta ? (
        <>
          <rect x={-15} y={-42} width={7} height={26} rx={3.5} fill={piel} />
          <rect x={-6.5} y={-47} width={7} height={30} rx={3.5} fill={piel} />
          <rect x={2} y={-45} width={7} height={28} rx={3.5} fill={piel} />
          <rect x={10} y={-38} width={6.5} height={22} rx={3.25} fill={piel} />
        </>
      ) : (
        <rect x={-15} y={-30} width={31} height={16} rx={8} fill={piel} />
      )}
      <rect x={-26} y={-12} width={16} height={8} rx={4} fill={piel} transform="rotate(-35 -18 -8)" />
      <path d="M-10 -2 h18" stroke={sombra} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
    </g>
  );
}

function Ojo({ cx, iris }: { cx: number; iris: string }) {
  return (
    <g>
      <ellipse cx={cx} cy={108} rx={6} ry={4.4} fill="#fbfbfb" />
      <circle cx={cx} cy={108} r={3.4} fill={iris} />
      <circle cx={cx} cy={108} r={1.5} fill="#111" />
      <circle cx={cx + 1.2} cy={106.8} r={0.8} fill="#fff" />
    </g>
  );
}

export function Interprete({
  signing = false,
  apariencia = APARIENCIA_POR_DEFECTO,
  soloCara = false,
}: {
  signing?: boolean;
  apariencia?: Partial<Apariencia>;
  soloCara?: boolean;
}) {
  const a = { ...APARIENCIA_POR_DEFECTO, ...apariencia };
  const [piel, sombra] = TONOS_PIEL[a.piel];
  const pelo = COLORES_PELO[a.colorPelo];
  const ropa = COLORES_ROPA[a.ropa];
  // Estatura: cuánto del cuerpo entra en el cuadro. Contextura: ancho del torso.
  const dy = { baja: 14, media: 0, alta: -14 }[a.estatura];
  const ancho = { delgada: 0.88, media: 1, robusta: 1.14 }[a.contextura];

  const cabeza = (
    <g>
      {/* pelo de atrás (largo y medio) */}
      {a.largoPelo === "largo" && <path d="M106 104c-6 50 0 86 12 96h64c12-10 18-46 12-96z" fill={pelo} />}
      {a.largoPelo === "medio" && <path d="M106 104c-4 26-2 42 6 50h76c8-8 10-24 6-50z" fill={pelo} />}
      {a.largoPelo === "tomado" && <circle cx={150} cy={52} r={16} fill={pelo} />}
      {/* cuello */}
      <rect x={132} y={138} width={36} height={50} rx={15} fill={piel} />
      <path d="M132 168c10 8 26 8 36 0v14c-10 6-26 6-36 0z" fill={sombra} opacity={0.45} />
      {/* orejas y cara */}
      <ellipse cx={110} cy={112} rx={7} ry={11} fill={sombra} />
      <ellipse cx={190} cy={112} rx={7} ry={11} fill={sombra} />
      <ellipse cx={150} cy={108} rx={40} ry={48} fill={piel} />
      {/* pelo de arriba */}
      {a.largoPelo !== "sin-pelo" && (
        <path d="M108 106c-5-42 20-58 44-58 31 0 47 21 43 58-6-18-19-29-36-31-21-2-39 7-51 31z" fill={pelo} />
      )}
      <path d="M127 95q9-6 18 0M155 95q9-6 18 0" fill="none" stroke={a.colorPelo === "canoso" ? "#8d8d8d" : pelo} strokeWidth={3.2} strokeLinecap="round" />
      <Ojo cx={136} iris={COLORES_OJOS[a.ojos]} />
      <Ojo cx={164} iris={COLORES_OJOS[a.ojos]} />
      {a.lentes && (
        <g fill="none" stroke="#2a2a2a" strokeWidth={2.4}>
          <rect x={124} y={99} width={24} height={18} rx={7} />
          <rect x={152} y={99} width={24} height={18} rx={7} />
          <path d="M148 106h4M124 105l-12-2M176 105l12-2" />
        </g>
      )}
      <path d="M150 112q-5 12 2 15" fill="none" stroke={sombra} strokeWidth={2.2} strokeLinecap="round" />
      <ellipse cx={128} cy={124} rx={7} ry={4} fill="#e0927b" opacity={0.3} />
      <ellipse cx={172} cy={124} rx={7} ry={4} fill="#e0927b" opacity={0.3} />
      {a.vello === "barba" && <path d="M112 118c2 30 18 40 38 40s36-10 38-40c-6 14-18 20-38 20s-32-6-38-20z" fill={pelo} opacity={0.92} />}
      {(a.vello === "bigote" || a.vello === "barba") && <path d="M136 129q14-7 28 0q-14 5-28 0z" fill={pelo} />}
      <path className="boca" d="M138 135q12 8 24 0" fill="none" stroke="#8f4a3c" strokeWidth={3} strokeLinecap="round" />
    </g>
  );

  if (soloCara) {
    return (
      <svg className="pu-retrato" viewBox="96 40 108 108" aria-hidden>
        <rect x={96} y={40} width={108} height={108} fill="#d7dde6" />
        <g transform={`translate(0 ${a.largoPelo === "tomado" ? 6 : 0})`}>
          <path d={`M${150 - 70 * ancho} 200c0-30 ${40 * ancho} -36 ${70 * ancho} -36s${70 * ancho} 6 ${70 * ancho} 36z`} fill={ropa} />
          {cabeza}
        </g>
      </svg>
    );
  }

  return (
    <svg className="pu-interprete" viewBox="0 0 300 260" data-signing={signing || undefined} aria-hidden>
      <g transform={`translate(0 ${dy})`}>
        <g transform={`translate(150 0) scale(${ancho} 1) translate(-150 0)`}>
          <path d="M36 262c0-58 46-84 114-84s114 26 114 84z" fill={ropa} />
        </g>
        <path d="M126 180l24 22 24-22" fill="none" stroke="#2c313b" strokeWidth={3} strokeLinejoin="round" />
        {cabeza}
        <g className="brazo-a">
          <path d={`M${150 - 70 * ancho} 236q-12-46 22-80`} fill="none" stroke={ropa} strokeWidth={34} strokeLinecap="round" />
          <Mano x={104} y={150} abierta piel={piel} sombra={sombra} />
        </g>
        <g className="brazo-b">
          <path d={`M${150 + 70 * ancho} 236q16-36-12-62`} fill="none" stroke={ropa} strokeWidth={34} strokeLinecap="round" />
          <Mano x={204} y={170} abierta={false} piel={piel} sombra={sombra} />
        </g>
      </g>
    </svg>
  );
}

/** Retrato redondo (foto de perfil y chat) dibujado con la misma apariencia. */
export function Retrato({ apariencia, size = 36 }: { apariencia?: Partial<Apariencia>; size?: number }) {
  return (
    <span className="pu-retrato-marco" style={{ width: size, height: size }} aria-hidden>
      <Interprete soloCara apariencia={apariencia} />
    </span>
  );
}
