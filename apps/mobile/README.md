# mobile (Capacitor)

Envuelve el export estático de `apps/web` para Android e iOS (ADR-0007).

```bash
pnpm --filter @puente/mobile exec cap add android   # una vez (requiere Android Studio)
pnpm --filter @puente/mobile exec cap add ios       # una vez (requiere macOS + Xcode)
pnpm --filter @puente/mobile sync                   # build web + copiar a los proyectos nativos
pnpm --filter @puente/mobile android
```

La carpeta `android/` ya está generada y versionada (permisos de cámara y micrófono en `AndroidManifest.xml`). La APK de pruebas la compila el CD (`.github/workflows/cd.yml`); ver `docs/DESPLIEGUE.md`. `ios/` también está versionada (Swift Package Manager, sin CocoaPods; permisos de cámara y micrófono en `ios/App/App/Info.plist`).

### Instalar en tu iPhone (gratis, con tu Apple ID)
1. Instala **Xcode** (App Store) y en *Settings → Accounts* agrega tu Apple ID.
2. `pnpm --filter @puente/mobile sync` y luego `pnpm --filter @puente/mobile ios` (abre Xcode).
3. En Xcode: target **App → Signing & Capabilities → Team** = tu Apple ID. Si reclama el *Bundle Identifier*, cámbialo a uno único (ej. `cl.puente.app.<tu-nombre>`).
4. iPhone por cable, con **Modo desarrollador** activo (*Ajustes → Privacidad y seguridad*). Elígelo arriba en Xcode y aprieta ▶.
5. La primera vez, en el iPhone: *Ajustes → General → VPN y gestión de dispositivos* → confiar en tu certificado.

Notas de iOS 27 / Xcode 27: la app usa `SceneDelegate` (Apple exige UIScene), el mínimo es iOS 15 y Capacitor está fijado en 6.2.2 (`capacitor-swift-pm` no publicó la 6.2.3). Si Xcode ofrece "Update to recommended settings", cancela.

Con Apple ID gratis la app deja de abrir a los 7 días: se reinstala con ▶. La URL de la API se hornea en el build (`NEXT_PUBLIC_API_URL`).
