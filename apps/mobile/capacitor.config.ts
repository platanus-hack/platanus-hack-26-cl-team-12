import type { CapacitorConfig } from "@capacitor/cli";

// Empaqueta el export estático de apps/web para Android e iOS (ADR-0007).
const config: CapacitorConfig = {
  appId: "cl.puente.app",
  appName: "Puente",
  webDir: "../web/out",
  // Android: permisos de cámara y micrófono en android/app/src/main/AndroidManifest.xml (versionado).
  // El WebView sirve la app desde https://localhost: ese origen está en CORS_ORIGINS (render.yaml).
  // iOS: proyecto en ios/ (Swift Package Manager, sin CocoaPods); permisos en ios/App/App/Info.plist (versionado).
};

export default config;
