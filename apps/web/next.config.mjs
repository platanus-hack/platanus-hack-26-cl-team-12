/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export estático: lo sirve Vercel y lo empaqueta Capacitor/Tauri (ADR-0007, ADR-0011).
  output: "export",
  images: { unoptimized: true },
  // Sin el botón "N" de desarrollo: en la demo tiene que verse como una app real.
  devIndicators: false,
  // Los paquetes del monorepo se publican como TypeScript fuente.
  transpilePackages: ["@puente/avatar", "@puente/glosses", "@puente/signs", "@puente/ui"],
};

export default nextConfig;
