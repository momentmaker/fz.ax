/*
 * fz.ax service worker
 *
 * Two responsibilities:
 *   1. Cache the app shell so fz.ax works offline after the first visit.
 *      - Cache-first for assets (the hashed /_nuxt/* bundle, icons, manifest).
 *      - Network-first for the document (always try to get the latest
 *        index.html when online; fall back to cached copy when offline).
 *   2. Host the Sunday Whisper notification, scheduled from the main
 *      thread via registration.showNotification with a TimestampTrigger.
 *      (The main thread handles scheduling; the SW is just the registration
 *      target. There is no SW-side re-scheduling or state persistence.)
 *
 * No Workbox, no @vite-pwa/nuxt, no IndexedDB, no Background Sync.
 * Hand-written, ~60 lines, legible in one sitting.
 */

// Bump this string on every deploy that changes a precached file
// (site.webmanifest, favicons, icons, or the root document). A bump
// triggers the activate handler to delete the old cache, forcing all
// clients to repopulate from the network. Hashed /_nuxt/* bundles
// have content-addressed filenames, so they don't require a bump.
const CACHE_VERSION = 'fz-ax-v1'

// The pre-cache list: essential shell URLs. Hashed /_nuxt/* files are
// NOT listed here — they're cached on first fetch instead.
const PRECACHE_URLS = [
  '/',
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-48x48.png',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
]

self.addEventListener('install', (event) => {
  // Activate the new SW immediately once the precache is fully populated.
  // skipWaiting is chained INTO waitUntil so the SW cannot take control
  // and start serving fetch events before addAll resolves.
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name)),
      ),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  // Network-first for the document (always get the latest when online).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() =>
          caches.match(request)
            .then((cached) => cached ?? caches.match('/'))
            // The terminal fallback: if a user hits navigate while
            // offline AND the install precache hasn't completed (e.g.,
            // SW waiting state during an update, or interrupted first
            // install), both matches return undefined and respondWith
            // would crash. Return an explicit 503 so the browser shows
            // a real response instead of a network error.
            .then((cached) => cached ?? new Response('offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' },
            })),
        ),
    )
    return
  }

  // Cache-first for assets.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        // Only cache successful same-origin responses.
        if (response.ok && new URL(request.url).origin === self.location.origin) {
          const copy = response.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        // Strict origin comparison rather than substring — avoids
        // matching any subdomain or other origin that happens to
        // contain the site's origin as a substring.
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
      return undefined
    }),
  )
})
