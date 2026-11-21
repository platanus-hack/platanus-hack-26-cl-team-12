# @puente/ui — sistema de diseño de Puente

Componentes por defecto, tokens y assets de la app. Es la versión en código del artefacto **Puente Design System** (https://claude.ai/artifact/7kbPXxp6kcwGSb3hQV3WVh). Si cambias algo aquí, actualiza también el artefacto, o avísale a Rafael.

## Cómo usarlo

```tsx
// apps/web/src/app/layout.tsx (ya está hecho)
import "@puente/ui/src/styles/tokens.css";      // colores, tipografías, espacios (Noche por defecto)
import "@puente/ui/src/styles/components.css";  // estilos de los componentes

// en cualquier pantalla
import { Button, CallStatus, Composer, Logo, Subtitles, VisualAlert } from "@puente/ui";
```

- Tema Día: `document.documentElement.dataset.theme = "light"`.
- Catálogo con todos los componentes y datos de ejemplo: `pnpm --filter @puente/web dev` y abre `/design`.
- Los tokens también están como datos: `import { tokens } from "@puente/ui"` (`src/tokens.json`).

## Qué hay

| Ruta | Qué |
|---|---|
| `src/components/` | Logo, Icon, Button, CallStatus, VisualAlert, Subtitles, QuickReplies, Composer, GlossChip, SignCamera, SignAvatar |
| `src/styles/tokens.css` | Variables CSS generadas desde `src/tokens.json` |
| `src/styles/components.css` | Estilos `pu-*` de los componentes |
| `assets/logos/` | Logo Noche, Día, una tinta e ícono de la app (copiado a `apps/web/public/icons/icon.svg`) |
| `assets/icons/` | Los 9 íconos como SVG con tinta `#0b1220` (en la app usa `<Icon name="…">`) |

Mensajes del contrato → componentes (`docs/contrato.md`):
- `ejecutivo_dice` → una línea en `Subtitles` (`text` = `simple ?? texto`, `original` = `texto`).
- `estado` → `CallStatus` (`llamada_iniciada` → `live`, `llamada_terminada` → `ended`) + `VisualAlert`.
- `glosas_cliente` → `SignCamera glosses`.
- `glosas_para_senar` → `SignAvatar glosses` + `subtitle`.

---

Puente permite que una persona sorda llame a servicios que solo atienden por teléfono (el banco, la clínica, el Estado). La app es una PWA en el celular del cliente; el ejecutivo, al otro lado, solo atiende el teléfono. Este sistema define cómo se ve y cómo habla esa app, desde el logo hasta cada pieza de la pantalla de llamada.

## A quién le hablamos

El cliente es una persona sorda. Para muchas el español escrito es su segunda lengua (la primera es la lengua de señas chilena, LSCh), así que la app escribe simple.

- Tutea al cliente: "Escribe lo que quieres decir". Al ejecutivo, Puente le habla de usted.
- Frases cortas, una idea por frase, palabras comunes. "Tengo hora el lunes a las 10" y no "Tendría disponibilidad el lunes 24 a las diez".
- Botones con un verbo: **Llamar**, **Decir**, **Colgar**, **Contestar**.
- Los errores dicen qué pasó y qué hacer: "Se cortó la llamada. Toca Llamar para intentar de nuevo."
- Di "personas sordas". Nunca "sordomudos" ni "discapacitados auditivos".
- Las glosas de LSCh van en MAYÚSCULAS (`YO QUERER HORA LUNES`), como en `packages/glosses`.
- Sin emoji: se leen mal en lectores de pantalla y braille.

## Color

Noche es el tema por defecto (es el de `apps/web/src/app/globals.css`). Día es el mismo sistema con más luz, para usar al sol.

- Fondo `bg`; paneles en `surface`; chips, burbujas del ejecutivo y botones secundarios en `surface-raised`.
- Texto en `fg`. Lo secundario (horas, quién habla, el texto original) en `muted`.
- `accent` (amarillo Puente) es para rellenos: el botón principal, los avisos visuales y la línea de subtítulos más reciente. Lo que va encima se escribe en `on-accent`. En Día nunca uses `accent` como color de texto.
- `cliente` (celeste) marca todo lo que dice la persona sorda: "Tú" en los subtítulos y el punto izquierdo del logo. Sus burbujas van sobre `cliente-soft` con texto en `fg`.
- `live` (verde) significa llamada en curso o cámara leyendo; `danger` es Colgar y los errores. Los dos van siempre con palabra o ícono: el color nunca es la única señal.
- Bordes decorativos en `line`; bordes de inputs y botones en `line-strong` (≥3:1).
- Todo texto cumple 4,5:1 sobre su fondo en los dos temas.

## Tipografía

- **Atkinson Hyperlegible** (`sans`) para todo lo que se lee: diseñada para baja visión, distingue bien l/I/1 y O/0.
- **Bricolage Grotesque** (`display`) solo para títulos (`display`, `title`) y el logotipo.
- **JetBrains Mono** (`mono`) para glosas (`gloss`) y números que cambian (`timer`).
- La base es 18px (`body`). Los subtítulos son lo más grande de la pantalla: `caption-live` (26px) para la última línea y `caption` (22px) para las anteriores.
- Las tres familias se cargan desde Google Fonts (lo hace `components/bundle.css`).

## Espacio, forma y toque

- Margen lateral `space-4`; entre bloques `space-6`; entre chips `space-2`.
- Todo control mide al menos `target-min` (48px). Llamar, Contestar y Colgar usan `target-lg` (64px) y van al alcance del pulgar, abajo.
- Esquinas: `radius-md` para botones y burbujas, `radius-lg` para paneles, `radius-pill` para estados y respuestas rápidas.
- Sin sombras: la profundidad se marca con `surface` → `surface-raised` y bordes.
- Foco: contorno sólido de `focus-width` (3px) en `focus`, desplazado 3px. Nunca lo quites.

## Accesibilidad (no negociable)

- Nada se comunica solo con sonido. El timbre es `VisualAlert` con `tone="incoming"`; el cambio de estado es `VisualAlert` + `CallStatus`.
- Los subtítulos usan `aria-live="polite"`; los avisos `role="alert"`.
- Con `prefers-reduced-motion` no hay parpadeo ni pulso.
- La app debe funcionar con una mano, porque la otra puede estar firmando frente a la cámara.

## Logo

El arco amarillo es el puente; los dos puntos son las dos personas de la llamada (celeste = cliente, claro = ejecutivo). En la app usa `Logo` (toma los colores del tema). Los archivos están en el grupo **Logos**, incluido el ícono de la PWA. No lo gires, no le cambies los colores y deja aire alrededor.

## Iconografía

Íconos de trazo propios (24px, trazo 2px, redondeados), en el componente `Icon` y como archivos en el grupo **Icons**. Siempre con texto al lado, salvo un botón de solo ícono con `label`.

## Cómo se arma una pantalla

Los componentes siguen las cuatro versiones del producto:

- **v1 (voz ↔ texto):** encabezado con `Logo` (mark) + `CallStatus`; `VisualAlert` arriba; `Subtitles` al centro; `Composer` con `QuickReplies` abajo; `Button` danger "Colgar".
- **v2 (simplificar):** igual, con `Subtitles showOriginal` para que el cliente pueda ver lo que dijo el ejecutivo.
- **v3 (señas → voz):** `SignCamera` reemplaza o acompaña a `Composer`; las glosas se muestran como `GlossChip` y el cliente confirma con **Decir**.
- **v4 (voz → señas):** `SignAvatar` arriba de `Subtitles`, con la glosa actual en amarillo.

## Guía por componente

### Logo

El arco de Puente: dos personas (punto celeste = cliente, punto claro = ejecutivo) unidas por un puente amarillo. Úsalo con `variant="wordmark"` en la pantalla de inicio y en el encabezado; `variant="mark"` solo cuando no hay espacio (barra superior durante la llamada, ícono de la app).

- Los colores vienen de `accent`, `cliente` y `fg`, así que el logo funciona en Noche y en Día sin variantes.
- `tone="mono"` hereda `color`: úsalo sobre fotos o rellenos `accent`.
- No lo gires, no le cambies los colores de los puntos y no le pongas sombra. Deja libre alrededor al menos el diámetro de un punto.
- El consumidor da `size` (alto en px del arco; el nombre escala con él).

### Icon

Íconos de trazo de 24px, 2px de grosor, extremos redondeados; heredan `currentColor`.

- Siempre acompaña un ícono con texto, salvo en botones de un solo ícono con `label` (se lee en voz alta para lectores de pantalla).
- Nombres en español: `llamar`, `colgar`, `enviar`, `escribir`, `camara`, `senas`, `subtitulos`, `avatar`, `aviso`.
- No uses emoji como íconos: muchas personas sordas usan lectores de pantalla en modo braille y los emoji se leen mal.

### Button

Botones de la app. **Primario** (amarillo `accent`) una vez por pantalla, para la acción que importa: Llamar, Decir. **Danger** solo para Colgar. **Secondary** para acciones alternativas, **ghost** para cancelar.

- `size="lg"` (64px) para Llamar, Contestar y Colgar: se tocan con el pulgar sin mirar.
- Verbo en infinitivo y corto: "Llamar", "Decir", "Colgar". Nunca "Haz clic aquí".
- Alto mínimo 48px (`target-min`). El foco es un contorno de 3px en `focus`.
- Recibe todas las props de `<button>` más `variant`, `size`, `icon` y `block`.

### CallStatus

Píldora con el estado de la llamada: lista, entrante, conectando, en llamada (con contador) o terminada.

- Siempre muestra la palabra, no solo el punto de color: el color nunca es la única señal.
- Va en el encabezado de la pantalla de llamada, junto al nombre de la institución.
- `seconds` solo se muestra en `live`. Mapea `estado: llamada_iniciada` → `live` y `llamada_terminada` → `ended` (docs/contrato.md).

### VisualAlert

Aviso visual grande que reemplaza tonos, timbres y avisos sonoros. Usa `role="alert"` para que se anuncie.

- `incoming` parpadea 3 veces (si el sistema no pide menos movimiento) y lleva un botón Contestar en `action`.
- `notice` (amarillo) para cambios de estado: "Llamada conectada".
- `error` dice qué pasó y qué hacer: "Se cortó la llamada. Toca Llamar para intentar de nuevo."
- `info` para avisos que no requieren acción.
- Uno a la vez, arriba de los subtítulos. `message={null}` lo oculta.

### Subtitles

Conversación en vivo: lo que dice el ejecutivo (izquierda) y lo que dice el cliente (derecha, en `cliente`). La última línea va más grande (`caption-live`) y marcada con un borde amarillo.

- Con v2, `text` es la versión simple y `original` lo que dijo el ejecutivo. `showOriginal` muestra el original en chico, para quien lo quiera revisar.
- El cliente aparece como "Tú". El otro lado como `otherName` (por defecto "Ejecutivo").
- `aria-live="polite"` anuncia cada línea nueva. Haz scroll automático al final solo si el usuario ya estaba abajo.

### QuickReplies

Respuestas de un toque para lo que más se repite en una llamada: Sí, No, Repita, Más lento.

- Máximo 4 a 6 opciones. Escríbelas como las diría el cliente, con "por favor" cuando corresponda (v2 las complejiza igual).
- Al tocar una se envía altiro, sin confirmar: `onPick(texto)`.
- Se pueden poner dentro de `Composer` como `children`.

### Composer

Donde el cliente escribe lo que quiere decir. Enter envía y Shift+Enter hace salto de línea. El botón dice **Decir** porque Puente lo habla por teléfono.

- Controlado (`value` + `onChange`) o no controlado (`defaultValue`). `onSend(texto)` recibe el texto sin espacios sobrantes.
- `sending` deshabilita el botón y muestra "Hablando…" mientras suena el TTS.
- El placeholder da un ejemplo real del escenario de demo, no "Escribe aquí".

### GlossChip

Una glosa de LSCh en MAYÚSCULAS y tipografía `mono`, como en `packages/glosses`.

- `done`: ya reconocida o ya señada. `active`: la que el avatar está haciendo ahora (amarillo). `pending`: lo que viene, con borde punteado.
- `confidence` (0 a 1) muestra el porcentaje; úsalo solo en el modo de depuración de v3.

### SignCamera

Panel de la cámara para v3: el cliente firma y ve las glosas que la app va reconociendo antes de decirlas.

- El consumidor pone el `<video>` real; la figura dibujada es solo el estado de ejemplo. TODO(real-data): reemplazar la figura por el stream de MediaPipe.
- El marco se pone verde (`live`) cuando hay manos en cuadro, y siempre dice "Leyendo señas" con palabra.
- `actions` lleva Decir (envía `glosas_cliente`) y Borrar. Nunca envíes solo: el cliente confirma.
- Sin HTTPS no hay cámara: muestra `state="off"` con el motivo en un VisualAlert.

### SignAvatar

Panel para v4: el avatar firma lo que dice el ejecutivo, con la secuencia de glosas y el subtítulo debajo.

- `glosses` y `subtitle` vienen del mensaje `glosas_para_senar` (docs/contrato.md); `current` es el índice de la glosa que se está reproduciendo.
- El subtítulo siempre se muestra: el avatar complementa el texto, no lo reemplaza.
- La figura es un marcador de posición. TODO(real-data): clips de `packages/avatar`.
