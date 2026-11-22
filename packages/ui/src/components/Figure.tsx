// Figura de ejemplo para cámara y avatar. TODO(real-data): reemplazar por video (v3) y clips (v4).
const POINTS: Array<[number, number]> = [[26, 52], [33, 50], [38, 55], [86, 42], [93, 44], [97, 50]];

export function Figure({ skin, body, hand, points }: { skin: string; body: string; hand: string; points?: string }) {
  return (
    <svg viewBox="0 0 120 100" aria-hidden>
      <circle className={skin} cx={60} cy={30} r={16} />
      <path className={body} d="M24 100c0-26 16-42 36-42s36 16 36 42z" />
      <rect className={hand} x={22} y={50} width={18} height={24} rx={9} transform="rotate(-18 31 62)" />
      <rect className={hand} x={82} y={40} width={18} height={24} rx={9} transform="rotate(14 91 52)" />
      {points && POINTS.map(([x, y]) => <circle key={`${x}-${y}`} className={points} cx={x} cy={y} r={2.2} />)}
    </svg>
  );
}
