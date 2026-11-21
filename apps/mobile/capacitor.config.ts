import type { CapacitorConfig } from "@capacitor/cli";

// Empaqueta el export estático de apps/web para Android e iOS (ADR-0007).
const config: CapacitorConfig = {
  appId: "cl.puente.app",
  appName: "Puente",
  webDir: "../web/out",
  // TODO: declarar permisos de cámara y micrófono en Info.plist (iOS) y AndroidManifest (Android)
  // después de `npx cap add ios` / `npx cap add android`.
};

export default config;
