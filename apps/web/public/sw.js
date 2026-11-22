// Service worker de Puente (D6): la app se abre y funciona sin internet.
// - Al instalarse guarda la página, los íconos, el manifest y las fotos de señas (de public/senas o del bucket S3
//   que llega en ?senas=<url> al registrarlo; el bucket necesita CORS con GET para este origen).
// - Navegación: primero la red (para tener lo último); sin red, la copia guardada.
// - Archivos estáticos (/_next/static, /senas, /icons): primero la copia guardada (no cambian).
// - Nunca guarda llamadas a la API ni a LiveKit (otros dominios): una llamada real siempre necesita internet.
// Cambia VERSION cuando quieras que todos los celulares descarten la copia vieja.
const VERSION = "puente-v4"; // v4: /reco en caché e índice de animaciones al día (v3: fotos S3, v2: avatar 3D)
// Base de las fotos: /senas (locales) o la URL del bucket. Sin `/` final.
const SENAS = (new URL(self.location.href).searchParams.get("senas") || "/senas").replace(/\/+$/, "");
const SENAS_URL = new URL(SENAS + "/", self.location.origin).href; // absoluta, para comparar con las peticiones
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
  // Avatar 3D: modelo (10 MB) y animaciones de las señas, para que el intérprete funcione sin internet.
  try {
    const r = await fetch("/anim/index.json", { cache: "no-store" });
    if (r.ok) {
      const ids = await r.clone().json();
      await cache.put("/anim/index.json", r);
      await cache.addAll(ids.map((id) => `/anim/${id}.json`));
    }
    await cache.add("/models/avatar.vrm");
  } catch {}
  // Fotos de señas (no se versionan; pueden no estar).
  try {
    const r = await fetch(`${SENAS}/manifest.json`, { cache: "no-store" });
    if (r.ok) {
      const m = await r.clone().json();
      await cache.put(`${SENAS}/manifest.json`, r);
      const fotos = Object.values(m).flat().map((f) => `${SENAS}/${f}`);
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
  if (req.method !== "GET") return;

  // Fotos de señas (locales o del bucket): primero la copia guardada (no cambian).
  if (url.href.startsWith(SENAS_URL)) {
    e.respondWith(primeroGuardada(req));
    return;
  }
  if (url.origin !== self.location.origin) return; // API, LiveKit y otros dominios: siempre a la red

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

  // El índice de animaciones cambia cuando se agregan glosas: primero la red (si no, el celular seguía con el viejo).
  if (url.pathname === "/anim/index.json") {
    e.respondWith(primeroRed(req));
    return;
  }

  if (/^\/(_next\/static|icons|anim|models|perfil|reco)\//.test(url.pathname) || url.pathname === "/manifest.webmanifest") {
    e.respondWith(primeroGuardada(req));
  }
});

function primeroRed(req) {
  return fetch(req)
    .then((res) => {
      if (res.ok) {
        const copia = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copia));
      }
      return res;
    })
    .catch(() => caches.match(req));
}

function primeroGuardada(req) {
  return caches.match(req).then(
    (guardada) =>
      guardada ||
      fetch(req).then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copia));
        }
        return res;
      }),
  );
}
