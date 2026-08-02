const CACHE_NAME = 'cica-nyt-v1.5.0';
const STATIC_ASSETS = [
    '/Cica-NyT/',
    '/Cica-NyT/index.html',
    '/Cica-NyT/offline.html',
    '/Cica-NyT/manifest.json',
    '/Cica-NyT/favicon.svg',
    '/Cica-NyT/icons.svg'
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
                .catch(() => caches.match(event.request))
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
