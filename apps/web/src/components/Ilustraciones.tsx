// Ilustraciones de los consejos de salud (planas, a color, propias).

export function IlustracionFractura() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden>
      <circle cx="48" cy="48" r="46" fill="#ffe2dc" />
      <path d="M22 70l38-30" stroke="#f2b896" strokeWidth="16" strokeLinecap="round" />
      <path d="M30 63l22-17" stroke="#ffffff" strokeWidth="20" strokeLinecap="round" />
      <path d="M30 63l22-17" stroke="#e8edf5" strokeWidth="20" strokeLinecap="round" strokeDasharray="3 5" />
      <path d="M58 18c14 10 20 26 16 44L36 82" fill="none" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="66" cy="38" r="9" fill="#9ad0ff" />
      <path d="M62 34l8 8M70 34l-8 8" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function IlustracionQuemadura() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden>
      <circle cx="48" cy="48" r="46" fill="#dff1ff" />
      <path d="M26 22h30a6 6 0 0 1 6 6v6H26z" fill="#8a96a8" />
      <rect x="56" y="30" width="10" height="10" rx="3" fill="#6b7789" />
      <path d="M44 40v6" stroke="#8a96a8" strokeWidth="6" strokeLinecap="round" />
      <path d="M44 50c-3 5-4 8-4 10a4 4 0 0 0 8 0c0-2-1-5-4-10z" fill="#3b9cff" />
      <path d="M44 66c-3 5-4 8-4 10a4 4 0 0 0 8 0c0-2-1-5-4-10z" fill="#3b9cff" opacity="0.6" />
      <path d="M24 80c6-8 16-10 26-6l20 6c4 1 4 6 0 6H30c-3 0-5-2-6-6z" fill="#f2b896" />
      <path d="M52 74c3-3 7-3 10 0" stroke="#e88f6a" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function IlustracionDatos() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden>
      <circle cx="48" cy="48" r="46" fill="#e5f7e9" />
      <rect x="18" y="28" width="60" height="42" rx="7" fill="#ffffff" stroke="#22a454" strokeWidth="3" />
      <circle cx="34" cy="45" r="7" fill="#f2b896" />
      <path d="M24 60c2-6 6-8 10-8s8 2 10 8z" fill="#3b82f6" />
      <rect x="50" y="40" width="20" height="4" rx="2" fill="#b8c2d0" />
      <rect x="50" y="49" width="14" height="4" rx="2" fill="#b8c2d0" />
      <circle cx="72" cy="66" r="12" fill="#e11d2a" />
      <path d="M72 59v14M65 66h14" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
}

/** Mapa pequeño dibujado (no usa servicios externos). */
export function MiniMapa() {
  return (
    <svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="320" height="120" fill="#dfe8d8" />
      <path d="M0 84h320M0 34h320M70 0v120M190 0v120M262 0v120" stroke="#ffffff" strokeWidth="10" />
      <path d="M0 84h320M70 0v120" stroke="#ffd67a" strokeWidth="5" />
      <path d="M120 0c10 40-20 80 10 120" stroke="#a9d2f4" strokeWidth="14" fill="none" />
      <rect x="84" y="44" width="34" height="28" rx="3" fill="#c9d6c0" />
      <rect x="204" y="46" width="42" height="26" rx="3" fill="#c9d6c0" />
      <rect x="276" y="44" width="30" height="30" rx="3" fill="#b8d6a8" />
      <circle cx="150" cy="58" r="22" fill="#3b82f6" opacity="0.18" />
      <circle cx="150" cy="58" r="9" fill="#3b82f6" stroke="#ffffff" strokeWidth="4" />
    </svg>
  );
}

export function IlustracionRepetir() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden>
      <circle cx="48" cy="48" r="46" fill="#efe6ff" />
      <rect x="18" y="26" width="46" height="30" rx="10" fill="#a855f7" />
      <path d="M30 56l-4 10 12-10z" fill="#a855f7" />
      <rect x="26" y="36" width="30" height="4" rx="2" fill="#fff" />
      <rect x="26" y="44" width="20" height="4" rx="2" fill="#fff" opacity="0.8" />
      <circle cx="68" cy="60" r="14" fill="#ffffff" stroke="#a855f7" strokeWidth="3" />
      <path d="M62 60a6 6 0 1 1 3 5.2" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />
      <path d="M61 54v6h6" fill="none" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IlustracionDerechos() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden>
      <circle cx="48" cy="48" r="46" fill="#fff3d6" />
      <path d="M48 18v58M30 76h36" stroke="#b7791f" strokeWidth="4" strokeLinecap="round" />
      <path d="M26 30h44" stroke="#b7791f" strokeWidth="4" strokeLinecap="round" />
      <path d="M26 30l-10 22h20zM70 30l-10 22h20z" fill="#f6c453" stroke="#b7791f" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="48" cy="18" r="5" fill="#b7791f" />
    </svg>
  );
}
