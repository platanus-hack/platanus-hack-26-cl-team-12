import type { Metadata, Viewport } from "next";
import "@puente/ui/src/styles/tokens.css";
import "@puente/ui/src/styles/components.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Puente",
  description: "Llamadas telefónicas accesibles para personas sordas",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
  // iPhone: al agregarla a la pantalla de inicio se abre a pantalla completa, sin la barra de Safari.
  appleWebApp: { capable: true, title: "Puente", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2f3f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body>{children}</body>
    </html>
  );
}
