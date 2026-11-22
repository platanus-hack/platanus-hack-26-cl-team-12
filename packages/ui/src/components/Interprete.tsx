// Intérprete de LSCh dibujado (marcador de posición del reproductor real).
// Como los intérpretes reales: ropa oscura y fondo liso, para que las manos se lean bien.
// Mientras `signing` es true, las manos se mueven. TODO(v4): reemplazar por fotos/clips de packages/avatar.
const TONOS = {
  clara: ["#f1c7a5", "#d9a37f"],
  media: ["#c68863", "#a96f4f"],
  oscura: ["#7a4b2e", "#5e3720"],
} as const;
export type TonoPiel = keyof typeof TONOS;
const PELO = "#2e211a";
const ROPA = "#1f232b";

function Mano({ x, y, abierta, PIEL, PIEL_SOMBRA }: { x: number; y: number; abierta: boolean; PIEL: string; PIEL_SOMBRA: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-16} y={-20} width={32} height={34} rx={13} fill={PIEL} />
      {abierta ? (
        <>
          <rect x={-15} y={-42} width={7} height={26} rx={3.5} fill={PIEL} />
          <rect x={-6.5} y={-47} width={7} height={30} rx={3.5} fill={PIEL} />
          <rect x={2} y={-45} width={7} height={28} rx={3.5} fill={PIEL} />
          <rect x={10} y={-38} width={6.5} height={22} rx={3.25} fill={PIEL} />
        </>
      ) : (
        <rect x={-15} y={-30} width={31} height={16} rx={8} fill={PIEL} />
      )}
      <rect x={-26} y={-12} width={16} height={8} rx={4} fill={PIEL} transform="rotate(-35 -18 -8)" />
      <path d="M-10 -2 h18" stroke={PIEL_SOMBRA} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
    </g>
  );
}

export function Interprete({ signing = false, piel = "media" }: { signing?: boolean; piel?: TonoPiel }) {
  const [PIEL, PIEL_SOMBRA] = TONOS[piel];
  return (
    <svg className="pu-interprete" viewBox="0 0 300 260" data-signing={signing || undefined} aria-hidden>
      {/* torso y cuello */}
      <path d="M36 262c0-58 46-84 114-84s114 26 114 84z" fill={ROPA} />
      <rect x={132} y={138} width={36} height={50} rx={15} fill={PIEL} />
      <path d="M132 168c10 8 26 8 36 0v14c-10 6-26 6-36 0z" fill={PIEL_SOMBRA} opacity={0.45} />
      <path d="M126 180l24 22 24-22" fill="none" stroke="#2c313b" strokeWidth={3} strokeLinejoin="round" />
      {/* cabeza */}
      <ellipse cx={110} cy={112} rx={7} ry={11} fill={PIEL_SOMBRA} />
      <ellipse cx={190} cy={112} rx={7} ry={11} fill={PIEL_SOMBRA} />
      <ellipse cx={150} cy={108} rx={40} ry={48} fill={PIEL} />
      <path d="M108 106c-5-42 20-58 44-58 31 0 47 21 43 58-6-18-19-29-36-31-21-2-39 7-51 31z" fill={PELO} />
      <path d="M127 95q9-6 18 0M155 95q9-6 18 0" fill="none" stroke={PELO} strokeWidth={3.2} strokeLinecap="round" />
      <ellipse cx={136} cy={108} rx={3.6} ry={4.4} fill="#1b1b1b" />
      <ellipse cx={164} cy={108} rx={3.6} ry={4.4} fill="#1b1b1b" />
      <path d="M150 112q-5 12 2 15" fill="none" stroke={PIEL_SOMBRA} strokeWidth={2.2} strokeLinecap="round" />
      <ellipse cx={128} cy={124} rx={7} ry={4} fill="#e0927b" opacity={0.35} />
      <ellipse cx={172} cy={124} rx={7} ry={4} fill="#e0927b" opacity={0.35} />
      <path className="boca" d="M138 134q12 9 24 0" fill="none" stroke="#8f4a3c" strokeWidth={3} strokeLinecap="round" />
      {/* brazos y manos */}
      <g className="brazo-a">
        <path d="M80 236q-12-46 22-80" fill="none" stroke={ROPA} strokeWidth={34} strokeLinecap="round" />
        <Mano x={104} y={150} abierta PIEL={PIEL} PIEL_SOMBRA={PIEL_SOMBRA} />
      </g>
      <g className="brazo-b">
        <path d="M220 236q16-36-12-62" fill="none" stroke={ROPA} strokeWidth={34} strokeLinecap="round" />
        <Mano x={204} y={170} abierta={false} PIEL={PIEL} PIEL_SOMBRA={PIEL_SOMBRA} />
      </g>
    </svg>
  );
}
