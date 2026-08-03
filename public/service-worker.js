const CACHE_NAME = 'cica-nyt-v1.6.4';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    '/favicon.svg',
    '/icons.svg'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Network-first for version.json
    if (url.pathname.endsWith('version.json')) {
        event.respondWith(
            fetch(event.request)
                .catch(async () => {
                    const cached = await caches.match(event.request);
                    if (cached) return cached;
                    return new Response(JSON.stringify({ version: "offline", build: "" }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    // Supabase API calls: Network only (handled by SyncService mostly, but bypass cache)
    if (url.hostname.includes('supabase.co')) {
        event.respondWith(fetch(event.request));
        return;
    }

    if (event.request.mode === 'navigate' || event.request.url.includes('index.html')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first for other assets
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('/Cica-NyT/offline.html');
                }
            });
        })
    );
});
