const CACHE_NAME = 'flow-events-cache-v4';

// Recursos essenciais pré-carregados durante a instalação
const PRECACHE_ASSETS = [
  '/',
  '/login',
  '/pdv',
  '/orders',
  '/events',
  '/dashboards',
  '/team',
  '/super-admin',
  '/icon.svg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Flow Events: Pré-caching de recursos offline iniciado');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Flow Events: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições de rede
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignorar chamadas que não são GET (como POST de autenticação ou envio de vendas)
  if (event.request.method !== 'GET') {
    return;
  }

  // 2. Ignorar tráfego do Firebase, Firestore, Google APIs ou Webpack HMR (hot-reload do dev)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.pathname.includes('/_next/webpack-hmr') ||
    url.pathname.includes('/__nextjs_original-stack-frame')
  ) {
    return;
  }

  // 3. Estratégia Cache-First para arquivos estáticos com Hash (imutáveis) do Next.js
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Em falha completa de rede e sem cache, retorna offline
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // 4. Estratégia Network-First com Fallback de Cache para páginas, imagens e outros assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se a requisição retornou sucesso, coloca uma cópia atualizada no Cache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        console.log('Flow Events: Modo offline ativo para requisição:', url.pathname);
        // Em caso de falha de rede (offline), busca no cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Se for uma requisição de navegação de página e não tiver no cache exato (ex: por causa de ?eventId=...)
          if (event.request.mode === 'navigate') {
            // Extrai o caminho básico sem query parameters (ex: /orders) e serve a rota base cacheada
            const cleanPathname = url.pathname;
            return caches.match(cleanPathname) || caches.match('/pdv') || caches.match('/login') || caches.match('/');
          }

          return new Response('Recurso indisponível offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
