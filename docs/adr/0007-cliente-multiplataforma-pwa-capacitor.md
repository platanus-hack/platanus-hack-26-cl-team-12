# ADR-0007: Cliente multiplataforma: PWA + Capacitor + Tauri

## Estado
Propuesto

## Contexto
La app debe funcionar en web, Android, iOS y, opcionalmente, escritorio (RF7). Las piezas críticas del
cliente son MediaPipe (ADR-0002), ONNX Runtime (ADR-0002), Three.js para el avatar (ADR-0003) y el SDK
de LiveKit (ADR-0005). Son 4 personas y unas 36 horas.

## Decisión
- **Base:** aplicación web **React + TypeScript** (Vite o Next.js en modo SPA) instalable como **PWA**.
- **Móvil:** empaquetar la misma build con **Capacitor** para Android e iOS (permisos nativos de cámara y
  micrófono, distribución en tiendas).
- **Escritorio (opcional):** empaquetar con **Tauri**.
- **Lógica desacoplada de la UI** en paquetes (`packages/signs`, `packages/avatar`, `packages/glosses`)
  para poder migrar a nativo en el futuro sin reescribir todo (ADR-0008).
- **Rendimiento en móvil:** delegado GPU de MediaPipe, cámara a 480p y procesamiento de cuadros a 15–20 fps;
  si el dispositivo no alcanza el umbral, se activa la extracción de puntos clave en el servidor.

## Consecuencias

### Positivas
- Un solo código para 3 o 4 plataformas.
- MediaPipe JS, ONNX web, Three.js y LiveKit JS funcionan sin adaptaciones.
- La demo puede mostrar Android y web en la misma llamada.

### Negativas
- El rendimiento en WebView es menor que en nativo, sobre todo en Android de gama baja.
- Las **llamadas entrantes con la app cerrada** (CallKit / ConnectionService + push) requieren plugins nativos de Capacitor; fuera del MVP.
- En iOS, WKWebView tiene restricciones de cámara y audio que hay que probar temprano.

### Neutrales
- Publicar en tiendas implica revisión de Apple y Google (fuera del alcance de la hackathon).

## Alternativas consideradas

**Expo / React Native (+ react-native-web)**
- Rechazada para el MVP: MediaPipe y ONNX en RN requieren módulos nativos (vision-camera, frame processors, TFLite) y el avatar 3D es más complejo. **Es el candidato natural para la v2 móvil.**

**Flutter**
- Rechazada: ecosistema de MediaPipe y 3D menos maduro, y el equipo tendría que aprender Dart.

**Apps nativas separadas (Swift / Kotlin)**
- Rechazada: triplica el trabajo.

## Referencias
- Capacitor, Tauri, MediaPipe Web
- ADR-0002, ADR-0003, ADR-0005, ADR-0008
