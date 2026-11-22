import type { Metadata, Viewport } from "next";
import "@puente/ui/src/styles/tokens.css";
import "@puente/ui/src/styles/components.css";
import "./globals.css";
import { SCRIPT_TEMA } from "@/lib/scriptTema";

export const metadata: Metadata = {
  title: "Bridge",
  description: "Llamadas telefónicas accesibles para personas sordas",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
  // iPhone: al agregarla a la pantalla de inicio se abre a pantalla completa, sin la barra de Safari.
  appleWebApp: { capable: true, title: "Bridge", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#141414", // oscuro por defecto; useAplicarPreferencias lo cambia con el tema
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme lo pone SCRIPT_TEMA antes de pintar (oscuro por defecto); por eso se suprime el aviso de hidratación.
    <html lang="es-CL" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        {/* Tipografía SUSE (Google Fonts). Sin internet se usa la del sistema. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=SUSE:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
