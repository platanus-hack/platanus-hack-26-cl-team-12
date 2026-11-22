import type { CapacitorConfig } from "@capacitor/cli";

// Empaqueta el export estático de apps/web para Android e iOS (ADR-0007).
const config: CapacitorConfig = {
  appId: "cl.puente.app",
  appName: "Puente",
  webDir: "../web/out",
  // Android: permisos de cámara y micrófono en android/app/src/main/AndroidManifest.xml (versionado).
  // El WebView sirve la app desde https://localhost: ese origen está en CORS_ORIGINS (render.yaml).
  // TODO: iOS (Info.plist) cuando se haga `cap add ios`; por ahora en iPhone se usa la PWA.
};

export default config;
