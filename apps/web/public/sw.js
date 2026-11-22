// Service worker de Puente (D6): la app se abre y funciona sin internet.
// - Al instalarse guarda la página, los íconos, el manifest y las fotos de señas (si existen en public/senas).
// - Navegación: primero la red (para tener lo último); sin red, la copia guardada.
// - Archivos estáticos (/_next/static, /senas, /icons): primero la copia guardada (no cambian).
// - Nunca guarda llamadas a la API ni a LiveKit (otros dominios): una llamada real siempre necesita internet.
// Cambia VERSION cuando quieras que todos los celulares descarten la copia vieja.
const VERSION = "puente-v1";
const BASICO = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon.svg"];

async function precargar() {
  const cache = await caches.open(VERSION);
  await cache.addAll(BASICO);
  // Los JS y CSS de Next llevan un hash en el nombre: se leen de la página para guardarlos también.
  try {
    const html = await (await fetch("/", { cache: "no-store" })).text();
    const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) || [])];
    await cache.addAll(assets);
  } catch {}
  // Fotos de señas (no se versionan; pueden no estar).
  try {
    const r = await fetch("/senas/manifest.json", { cache: "no-store" });
    if (r.ok) {
      const m = await r.clone().json();
      await cache.put("/senas/manifest.json", r);
      const fotos = Object.values(m).flat().map((f) => `/senas/${f}`);
      await cache.addAll(fotos);
    }
  } catch {}
}

self.addEventListener("install", (e) => {
  e.waitUntil(precargar().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // Solo se guarda la portada (la app). /design u otras páginas no la pisan.
          if (url.pathname === "/" && res.ok) {
            const copia = res.clone();
            caches.open(VERSION).then((c) => c.put("/", copia));
          }
          return res;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  if (/^\/(_next\/static|senas|icons)\//.test(url.pathname) || url.pathname === "/manifest.webmanifest") {
    e.respondWith(
      caches.match(req).then(
        (guardada) =>
          guardada ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copia));
            }
            return res;
          }),
      ),
    );
  }
});
