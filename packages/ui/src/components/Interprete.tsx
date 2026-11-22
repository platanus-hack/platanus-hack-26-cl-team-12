// Intérprete de LSCh dibujado y personalizable, con volumen (degradados) para que se vea más realista.
// Como los intérpretes reales: ropa oscura y fondo liso, para que las manos se lean bien.
// `apariencia` define estatura, contextura, piel, cara, edad, pelo, ojos, lentes, vello facial y ropa.
// `soloCara` dibuja solo el retrato.
// TODO(v4): un avatar 3D (por ejemplo VRM con three.js) se vería como un personaje de videojuego; requiere modelos 3D.
import { useId } from "react";

export const TONOS_PIEL = {
  "muy-clara": ["#f8dcc6", "#e3b597", "#c98f6e"],
  clara: ["#f0c8a8", "#d9a07c", "#b97a57"],
  media: ["#cf966f", "#ad7350", "#8a5537"],
  morena: ["#a26a45", "#80502f", "#5f3820"],
  oscura: ["#6e432a", "#53301c", "#3a1f11"],
} as const;
export const COLORES_PELO = { negro: "#1c1512", castano: "#4a2e1f", rubio: "#c7a05c", pelirrojo: "#9b4320", canoso: "#b9b6b2" } as const;
export const COLORES_OJOS = { cafe: "#5a3820", verde: "#4b7d47", azul: "#3d72b4", gris: "#7d8a96", negro: "#1d1d1d" } as const;
export const COLORES_ROPA = { negro: "#1d2027", marino: "#1b2947", grafito: "#3a3f48", burdeo: "#5a1f2b" } as const;

export interface Apariencia {
  estatura: "baja" | "media" | "alta";
  contextura: "delgada" | "media" | "robusta";
  piel: keyof typeof TONOS_PIEL;
  cara: "ovalada" | "redonda" | "cuadrada";
  edad: "joven" | "adulta" | "mayor";
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
  cara: "ovalada",
  edad: "adulta",
  largoPelo: "corto",
  colorPelo: "negro",
  ojos: "cafe",
  lentes: false,
  vello: "ninguno",
  ropa: "negro",
};

const CARAS = {
  ovalada: "M110 102c0-30 18-50 40-50s40 20 40 50c0 30-16 56-40 56s-40-26-40-56z",
  redonda: "M108 104c0-30 19-50 42-50s42 20 42 50c0 28-18 50-42 50s-42-22-42-50z",
  cuadrada: "M111 100c0-28 17-48 39-48s39 20 39 48c0 22-2 38-10 46-7 8-17 12-29 12s-22-4-29-12c-8-8-10-24-10-46z",
} as const;

function Mano({ x, y, abierta, g }: { x: number; y: number; abierta: boolean; g: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-16} y={-20} width={32} height={34} rx={13} fill={`url(#${g}-mano)`} />
      {abierta ? (
        <>
          <rect x={-15} y={-42} width={7} height={26} rx={3.5} fill={`url(#${g}-mano)`} />
          <rect x={-6.5} y={-47} width={7} height={30} rx={3.5} fill={`url(#${g}-mano)`} />
          <rect x={2} y={-45} width={7} height={28} rx={3.5} fill={`url(#${g}-mano)`} />
          <rect x={10} y={-38} width={6.5} height={22} rx={3.25} fill={`url(#${g}-mano)`} />
          <path d="M-12 -40v3M-3 -45v3M5 -43v3M13 -36v3" stroke="#fff" strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" />
        </>
      ) : (
        <rect x={-15} y={-30} width={31} height={16} rx={8} fill={`url(#${g}-mano)`} />
      )}
      <rect x={-26} y={-12} width={16} height={8} rx={4} fill={`url(#${g}-mano)`} transform="rotate(-35 -18 -8)" />
      <path d="M-10 -2h18M-8 4h14" stroke="#000" strokeOpacity={0.12} strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
}

function Ojo({ cx, g, mayor }: { cx: number; g: string; mayor: boolean }) {
  return (
    <g>
      <path d={`M${cx - 8} 108q8-6.5 16 0q-8 5.5-16 0z`} fill="#fbf8f5" />
      <circle cx={cx} cy={108} r={3.7} fill={`url(#${g}-iris)`} />
      <circle cx={cx} cy={108} r={1.6} fill="#0d0d0d" />
      <circle cx={cx + 1.3} cy={106.7} r={0.9} fill="#fff" />
      {/* párpado superior y pestañas */}
      <path d={`M${cx - 8.5} 107.6q8.5-7.5 17 0`} fill="none" stroke="#2a1d17" strokeWidth={1.8} strokeLinecap="round" />
      <path d={`M${cx - 7} 111q7 3 14 0`} fill="none" stroke="#000" strokeOpacity={0.15} strokeWidth={1} />
      {mayor && <path d={`M${cx - 6} 114q6 2.5 12 0`} fill="none" stroke="#000" strokeOpacity={0.18} strokeWidth={1} />}
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
  const g = useId().replace(/[^a-zA-Z0-9]/g, "");
  const a = { ...APARIENCIA_POR_DEFECTO, ...apariencia };
  const [luz, base, sombra] = TONOS_PIEL[a.piel];
  const pelo = a.edad === "mayor" && a.colorPelo !== "rubio" ? COLORES_PELO.canoso : COLORES_PELO[a.colorPelo];
  const ropa = COLORES_ROPA[a.ropa];
  const dy = { baja: 14, media: 0, alta: -14 }[a.estatura];
  const ancho = { delgada: 0.88, media: 1, robusta: 1.14 }[a.contextura];
  const mayor = a.edad === "mayor";
  const joven = a.edad === "joven";

  const defs = (
    <defs>
      <radialGradient id={`${g}-piel`} cx="45%" cy="38%" r="70%">
        <stop offset="0%" stopColor={luz} />
        <stop offset="62%" stopColor={base} />
        <stop offset="100%" stopColor={sombra} />
      </radialGradient>
      <linearGradient id={`${g}-mano`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={luz} />
        <stop offset="100%" stopColor={base} />
      </linearGradient>
      <linearGradient id={`${g}-cuello`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={sombra} />
        <stop offset="45%" stopColor={base} />
      </linearGradient>
      <linearGradient id={`${g}-pelo`} x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stopColor={pelo} stopOpacity={0.85} />
        <stop offset="35%" stopColor={pelo} />
        <stop offset="100%" stopColor="#000" stopOpacity={0.55} />
      </linearGradient>
      <linearGradient id={`${g}-ropa`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={ropa} />
        <stop offset="100%" stopColor="#000" stopOpacity={0.6} />
      </linearGradient>
      <radialGradient id={`${g}-iris`}>
        <stop offset="0%" stopColor={COLORES_OJOS[a.ojos]} stopOpacity={0.7} />
        <stop offset="100%" stopColor={COLORES_OJOS[a.ojos]} />
      </radialGradient>
    </defs>
  );

  const cabeza = (
    <g>
      {/* pelo de atrás */}
      {a.largoPelo === "largo" && <path d="M104 100c-8 56 0 92 14 104h64c14-12 22-48 14-104z" fill={`url(#${g}-pelo)`} />}
      {a.largoPelo === "medio" && <path d="M104 100c-5 28-3 46 7 56h78c10-10 12-28 7-56z" fill={`url(#${g}-pelo)`} />}
      {a.largoPelo === "tomado" && (
        <g>
          <circle cx={150} cy={50} r={17} fill={`url(#${g}-pelo)`} />
          <path d="M140 44q10-6 20 0" stroke="#fff" strokeOpacity={0.18} strokeWidth={2} fill="none" />
        </g>
      )}
      {/* cuello con sombra bajo la mandíbula */}
      <path d="M132 140h36v42c-10 8-26 8-36 0z" fill={`url(#${g}-cuello)`} />
      {/* orejas */}
      <ellipse cx={110} cy={110} rx={7} ry={11} fill={base} />
      <path d="M108 104q3 6 0 12" stroke={sombra} strokeWidth={2} fill="none" strokeLinecap="round" />
      <ellipse cx={190} cy={110} rx={7} ry={11} fill={base} />
      <path d="M192 104q-3 6 0 12" stroke={sombra} strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* cara */}
      <path d={CARAS[a.cara]} fill={`url(#${g}-piel)`} />
      {/* mejillas y mentón con luz */}
      <ellipse cx={128} cy={124} rx={8} ry={5} fill="#e07f6a" opacity={joven ? 0.32 : 0.2} />
      <ellipse cx={172} cy={124} rx={8} ry={5} fill="#e07f6a" opacity={joven ? 0.32 : 0.2} />
      <ellipse cx={150} cy={148} rx={10} ry={4} fill="#fff" opacity={0.12} />
      {/* pelo de arriba, con mechones */}
      {a.largoPelo !== "sin-pelo" && (
        <g>
          <path d="M108 104c-6-44 20-60 44-60 32 0 48 22 43 60-5-17-17-28-34-31-8 8-22 12-35 12-8 4-14 10-18 19z" fill={`url(#${g}-pelo)`} />
          <path d="M126 60q14-8 32-4M120 72q18-12 40-8" stroke="#fff" strokeOpacity={0.16} strokeWidth={2} fill="none" strokeLinecap="round" />
        </g>
      )}
      {a.largoPelo === "sin-pelo" && <path d="M116 78q34-26 68 0" stroke="#fff" strokeOpacity={0.18} strokeWidth={6} fill="none" strokeLinecap="round" />}
      {/* cejas */}
      <path d="M125 96q10-6 20-1l-1 3q-9-3-18 1z" fill={a.edad === "mayor" ? "#8c8781" : COLORES_PELO[a.colorPelo]} />
      <path d="M175 96q-10-6-20-1l1 3q9-3 18 1z" fill={a.edad === "mayor" ? "#8c8781" : COLORES_PELO[a.colorPelo]} />
      <Ojo cx={136} g={g} mayor={mayor} />
      <Ojo cx={164} g={g} mayor={mayor} />
      {/* nariz: tabique, punta y fosas */}
      <path d="M147 110q-2 10-5 15q4 3 8 3q4 0 8-3q-3-5-5-15" fill="none" stroke={sombra} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
      <ellipse cx={150} cy={124} rx={5} ry={2.4} fill="#fff" opacity={0.15} />
      {/* arrugas según edad */}
      {mayor && (
        <g stroke="#000" strokeOpacity={0.16} strokeWidth={1.2} fill="none" strokeLinecap="round">
          <path d="M132 84q18-4 36 0M134 89q16-3 32 0" />
          <path d="M138 128q-4 6-1 12M162 128q4 6 1 12" />
        </g>
      )}
      {a.edad === "adulta" && <path d="M139 129q-3 5-1 9M161 129q3 5 1 9" stroke="#000" strokeOpacity={0.09} strokeWidth={1.2} fill="none" strokeLinecap="round" />}
      {/* labios */}
      <path d="M139 136q5-3 11-1q6-2 11 1q-5 3-11 3q-6 0-11-3z" fill="#a8574a" />
      <path d="M140 136.5q10 7 20 0q-4 5-10 5q-6 0-10-5z" fill="#c06b5c" />
      <path d="M139 136.5q11 2 22 0" stroke="#6d2e25" strokeWidth={1} fill="none" />
      {/* vello facial */}
      {a.vello === "barba" && <path d="M113 116c2 32 18 44 37 44s35-12 37-44c-5 15-17 24-37 24s-32-9-37-24z" fill={`url(#${g}-pelo)`} opacity={0.92} />}
      {(a.vello === "bigote" || a.vello === "barba") && <path d="M137 132q13-6 26 0q-6 3-13 2q-7 1-13-2z" fill={pelo} />}
      {/* lentes */}
      {a.lentes && (
        <g fill="none" stroke="#222" strokeWidth={2.2}>
          <rect x={124} y={100} width={24} height={17} rx={6} fill="#fff" fillOpacity={0.08} />
          <rect x={152} y={100} width={24} height={17} rx={6} fill="#fff" fillOpacity={0.08} />
          <path d="M148 106h4M124 105l-13-2M176 105l13-2" />
        </g>
      )}
    </g>
  );

  if (soloCara) {
    return (
      <svg className="pu-retrato" viewBox="96 40 108 108" aria-hidden>
        {defs}
        <rect x={96} y={40} width={108} height={108} fill="#d7dde6" />
        <g transform={`translate(0 ${a.largoPelo === "tomado" ? 6 : 0})`}>
          <path d={`M${150 - 70 * ancho} 200c0-30 ${40 * ancho} -36 ${70 * ancho} -36s${70 * ancho} 6 ${70 * ancho} 36z`} fill={`url(#${g}-ropa)`} />
          {cabeza}
        </g>
      </svg>
    );
  }

  return (
    <svg className="pu-interprete" viewBox="0 0 300 260" data-signing={signing || undefined} aria-hidden>
      {defs}
      <g transform={`translate(0 ${dy})`}>
        <g transform={`translate(150 0) scale(${ancho} 1) translate(-150 0)`}>
          <path d="M36 262c0-58 46-84 114-84s114 26 114 84z" fill={`url(#${g}-ropa)`} />
          {/* pliegues y cuello de la ropa */}
          <path d="M96 210q10 20 8 52M204 210q-10 20-8 52" stroke="#000" strokeOpacity={0.25} strokeWidth={2} fill="none" />
        </g>
        <path d="M128 179l22 24 22-24" fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={3} strokeLinejoin="round" />
        {cabeza}
        <g className="brazo-a">
          <path d={`M${150 - 70 * ancho} 236q-12-46 22-80`} fill="none" stroke={`url(#${g}-ropa)`} strokeWidth={34} strokeLinecap="round" />
          <Mano x={104} y={150} abierta g={g} />
        </g>
        <g className="brazo-b">
          <path d={`M${150 + 70 * ancho} 236q16-36-12-62`} fill="none" stroke={`url(#${g}-ropa)`} strokeWidth={34} strokeLinecap="round" />
          <Mano x={204} y={170} abierta={false} g={g} />
        </g>
      </g>
    </svg>
  );
}

/** Retrato redondo dibujado con la misma apariencia. */
export function Retrato({ apariencia, size = 36 }: { apariencia?: Partial<Apariencia>; size?: number }) {
  return (
    <span className="pu-retrato-marco" style={{ width: size, height: size }} aria-hidden>
      <Interprete soloCara apariencia={apariencia} />
    </span>
  );
}
