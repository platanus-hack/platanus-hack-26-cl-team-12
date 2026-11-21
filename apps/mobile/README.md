# mobile (Capacitor)

Envuelve el export estático de `apps/web` para Android e iOS (ADR-0007).

```bash
pnpm --filter @puente/mobile exec cap add android   # una vez (requiere Android Studio)
pnpm --filter @puente/mobile exec cap add ios       # una vez (requiere macOS + Xcode)
pnpm --filter @puente/mobile sync                   # build web + copiar a los proyectos nativos
pnpm --filter @puente/mobile android
```

Las carpetas `android/` e `ios/` generadas sí se versionan (contienen los permisos de cámara y micrófono).
