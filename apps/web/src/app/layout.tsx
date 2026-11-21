import type { Metadata, Viewport } from "next";
import "@puente/ui/src/styles/tokens.css";
import "@puente/ui/src/styles/components.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Puente",
  description: "Llamadas telefónicas accesibles para personas sordas",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3f5fc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body>{children}</body>
    </html>
  );
}
