/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export estático: lo sirve Vercel y lo empaqueta Capacitor/Tauri (ADR-0007, ADR-0011).
  output: "export",
  images: { unoptimized: true },
  // Los paquetes del monorepo se publican como TypeScript fuente.
  transpilePackages: ["@puente/avatar", "@puente/glosses", "@puente/signs", "@puente/ui"],
};

export default nextConfig;
