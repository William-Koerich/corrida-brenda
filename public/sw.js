// Service worker da Cronometragem 3 km.
// - /_next/static/*: cache primeiro (arquivos com hash, nunca mudam)
// - páginas: rede primeiro; sem internet, a última versão guardada
// - Supabase e outros domínios: não passam por aqui (a fila offline cuida disso)

const VERSION = "v3";
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`;
const ROUTES = ["/", "/chegada", "/largada", "/resultados", "/atletas", "/telao"];
const NAV_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(precache());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [STATIC_CACHE, PAGES_CACHE];
      for (const key of await caches.keys()) {
        if (!keep.includes(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

/** Guarda as telas e os arquivos que o HTML delas referencia. */
async function precache() {
  const pages = await caches.open(PAGES_CACHE);
  const statics = await caches.open(STATIC_CACHE);
  const assets = new Set();

  await Promise.all(
    ROUTES.map(async (route) => {
      try {
        const res = await fetch(route, { cache: "reload" });
        if (!res.ok) return;
        await pages.put(route, res.clone());
        const html = await res.text();
        for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) assets.add(m[0]);
      } catch {
        // sem rede na instalação: fica para a próxima visita
      }
    }),
  );

  await Promise.all([...assets].map((url) => statics.add(url).catch(() => {})));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request, url));
  } else if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest" || /\.(png|ico|svg)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirstPage(request, url) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const res = await withTimeout(fetch(request), NAV_TIMEOUT_MS);
    if (res.ok) cache.put(url.pathname, res.clone());
    return res;
  } catch {
    return (
      (await cache.match(url.pathname)) ??
      (await cache.match("/chegada")) ??
      new Response("<h1>Sem internet</h1><p>Abra o app uma vez com internet para usá-lo offline.</p>", {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    );
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}
