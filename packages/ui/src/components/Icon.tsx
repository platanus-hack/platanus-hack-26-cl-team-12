const ICONS = {
  llamar: ["M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"],
  colgar: ["M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z", "M3 3l18 18"],
  enviar: ["M4 11.5L20 4l-7.5 16-2-6.5z"],
  camara: ["M3 8h4l2-3h6l2 3h4v12H3z", "M15.5 13.5a3.5 3.5 0 1 1-7 0a3.5 3.5 0 1 1 7 0"],
  senas: [
    "M7 14V7.5a1.5 1.5 0 0 1 3 0V12",
    "M10 11V5.5a1.5 1.5 0 0 1 3 0V11",
    "M13 11V6.5a1.5 1.5 0 0 1 3 0V12",
    "M16 12V9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.6-2.2L4.3 15.6a1.6 1.6 0 0 1 2.4-2.1L7 14",
  ],
  subtitulos: ["M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M7 10h6M15 10h2M7 14h3M12 14h5"],
  aviso: ["M12 3l10 18H2z", "M12 10v4.5M12 17.5h.01"],
  escribir: ["M5 6h14M12 6v13M9 19h6"],
  avatar: ["M16 8a4 4 0 1 1-8 0a4 4 0 1 1 8 0", "M4 21a8 8 0 0 1 16 0"],
  inicio: ["M3 11l9-7 9 7", "M5 10v10h5v-6h4v6h5V10"],
  historial: ["M21 12a9 9 0 1 1-9-9a9 9 0 0 1 9 9z", "M12 7v5l3 2"],
} as const;

export type IconName = keyof typeof ICONS;
export const iconNames = Object.keys(ICONS) as IconName[];

/** Íconos de trazo de 24px. Heredan currentColor. Con `label` se anuncian; sin él son decorativos. */
export function Icon({ name, size = 24, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      className="pu-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
