const CACHE_NAME = 'cica-nyt-v2.14.0';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    '/favicon.svg',
    '/icons.svg'
];

self.addEventListener('message', event => {
    if (event.data && (event.data.type === 'SKIP_WAITING' || event.data.action === 'skipWaiting')) {
        self.skipWaiting();
    }
});

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

// Push Notifications Event Handling
self.addEventListener('push', event => {
    let data = { title: 'Cica-NyT Értesítés', body: 'Új oltási vagy egészségügyi esemény esedékes! 🐾' };
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    const options = {
        body: data.body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        vibrate: [100, 50, 100],
        data: { url: '/' }
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (const client of clientList) {
                if (client.url === '/' && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('/');
        })
    );
});
