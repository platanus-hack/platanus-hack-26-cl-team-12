// Dónde están las fotos de las señas (Diccionario LSCh, UMCE). No van en el repo por derechos:
// - Local: apps/web/scripts/extraer_senas.py las deja en public/senas/ → se sirven en /senas.
// - Desplegado: se suben a un bucket S3 (ver docs/DESPLIEGUE.md) y NEXT_PUBLIC_SENAS_URL apunta ahí,
//   p. ej. https://<bucket>.s3.<región>.amazonaws.com/senas. Se graba en el build: si cambia, hay que recompilar.

/** Base de las fotos, sin `/` final. Vacía en el entorno = las fotos locales de public/senas. */
export const SENAS_BASE = (process.env.NEXT_PUBLIC_SENAS_URL ?? "").trim().replace(/\/+$/, "") || "/senas";

/** URL de una foto (o del manifest) dentro de la base. */
export const urlSena = (archivo: string) => `${SENAS_BASE}/${archivo}`;
