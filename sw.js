// Cache version auto-generated on save: 2026-04-24T17:07
const CACHE_VERSION = '20260424-1707';
const CACHE_NAME = `midnight-${CACHE_VERSION}`;
const ASSETS = [
  '/',
  '/offline.html',
  '/assets/css/tokens.css',
  '/assets/css/base.css',
  '/assets/css/layout.css',
  '/assets/css/components.css',
  '/assets/css/utils.css',
  '/assets/images/hero-optimized.jpg',
  '/accesos.html',
  '/members.html',
  '/carta.html',
  '/faq.html',
  '/members-only.html',
  '/legales.html',
  '/success.html',
  '/assets/images/icon-192.png',
  '/assets/images/icon-512.png'
];

// Instalación
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activación
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Excluir auth requests del cache, mostrar offline cuando falla
self.addEventListener('fetch', (e) => {
  // No cachear Edge Functions ni requests de autenticación
  const url = e.request.url;
  if (url.includes('/functions/v1/') || url.includes('supabase.co')) {
    e.respondWith(fetch(e.request));
    return;
  }
  
  // Tratar peticiones de navegación y peticiones SPA (fetch de archivos .html) como Network-First
  const isHtml = e.request.mode === 'navigate' || 
                 e.request.headers.get('accept')?.includes('text/html') ||
                 url.endsWith('.html') || 
                 url.endsWith('/');
                 
  if (isHtml) {
    e.respondWith(
      fetch(e.request)
        .catch(() => {
          // Si falla la red, intentar cache o mostrar offline
          return caches.match(e.request)
            .then((cached) => cached || caches.match('/offline.html'));
        })
    );
    return;
  }
  
  // Para otros recursos: cache-first
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
