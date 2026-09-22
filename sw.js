/* ============================================================
   Service Worker · Calculadora Corte y Canteado · AG5
   Estrategia: NETWORK-FIRST con caché de respaldo.
     - Si hay red: se sirve la versión fresca y se actualiza la caché.
     - Sin red: se sirve la última copia cacheada (la app funciona offline).

   ACTUALIZACIONES: este SW NO llama a skipWaiting() por su cuenta.
   Cuando Netlify sirve un sw.js con CACHE_VERSION nueva, el navegador lo
   instala y lo deja EN ESPERA; la página muestra entonces el botón verde
   "🔄 Actualizar app". Al pulsarlo, la página envía {type:'SKIP_WAITING'},
   este SW toma el control (clients.claim) y la página se recarga con la
   versión nueva. Si no se pulsa, la versión nueva entra igualmente en el
   siguiente arranque completo de la app. Así la app NUNCA se recarga sola
   a mitad de un pedido.

   CACHE_VERSION va ligada al timestamp del build: cada entrega que cambie
   index.html debe subir también este sw.js con CACHE_VERSION nueva
   (bump_build.py --sw sw.js), o la app instalada no se entera del cambio.

   11-09-2026: vuelve al repo de GitHub (ag5corte) junto con manifest.json y
   los 4 iconos; hasta hoy producción los servía en 404 y la app no se podía
   instalar ni funcionar sin red. Bypass ampliado a cualquier ruta /api/ y al
   puerto 8055 del Servidor G5 (LAN), no solo a Tailscale.
   ============================================================ */

const CACHE_VERSION = 'ag5-corte-20260918-071153';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-64.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => { /* si algo falla en precache, la app sigue por red */ })
  );
});

// La página pide activar la versión en espera (botón "Actualizar app").
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo GET; el resto (POST a la API de Anthropic o al Servidor G5) pasa
  // directo a la red sin tocar la caché.
  if (req.method !== 'GET') return;

  // No interceptamos orígenes de datos: API de Anthropic, Servidor G5
  // (Tailscale *.ts.net, LAN en el puerto 8055 o cualquier ruta /api/).
  // Los listados de presupuestos/pedidos y la BBDD compartida NUNCA deben
  // servirse de caché. Sí cacheamos CDNs de librerías y fuentes como respaldo.
  const url = new URL(req.url);
  const esApi = url.hostname.includes('api.anthropic.com')
    || url.hostname.endsWith('.ts.net')
    || url.port === '8055'
    || url.pathname.startsWith('/api/');
  if (esApi) return;

  event.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp && (resp.status === 200 || resp.type === 'opaque')) {
          const copia = resp.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(req, copia).catch(() => {});
          }).catch(() => {});
        }
        return resp;
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit;
          if (req.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        })
      )
  );
});
