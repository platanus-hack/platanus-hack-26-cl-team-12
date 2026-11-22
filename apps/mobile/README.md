# mobile (Capacitor)

Envuelve el export estático de `apps/web` para Android e iOS (ADR-0007).

```bash
pnpm --filter @puente/mobile exec cap add android   # una vez (requiere Android Studio)
pnpm --filter @puente/mobile exec cap add ios       # una vez (requiere macOS + Xcode)
pnpm --filter @puente/mobile sync                   # build web + copiar a los proyectos nativos
pnpm --filter @puente/mobile android
```

La carpeta `android/` ya está generada y versionada (permisos de cámara y micrófono en `AndroidManifest.xml`). La APK de pruebas la compila el CD (`.github/workflows/cd.yml`); ver `docs/DESPLIEGUE.md`. `ios/` todavía no existe: en iPhone se usa la PWA.
