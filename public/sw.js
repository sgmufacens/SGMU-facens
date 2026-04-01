// FleetControl Service Worker
const CACHE_VERSION = 'v1'
const STATIC_CACHE = `fleetcontrol-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `fleetcontrol-runtime-${CACHE_VERSION}`

// Recursos para pré-cachear na instalação
const PRECACHE_URLS = [
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
]

// ── Install ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// ── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora não-GET, extensões do browser e chamadas Supabase
  if (request.method !== 'GET') return
  if (url.protocol === 'chrome-extension:') return
  if (url.hostname.includes('supabase.co')) return
  if (url.hostname.includes('supabase.com')) return

  // Recursos estáticos Next.js → cache first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Ícones e manifest → cache first
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    )
    return
  }

  // Navegação (páginas) → network first, fallback para cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(cached => cached || caches.match('/'))
      )
    )
    return
  }

  // Tudo o mais → network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})
