/* =========================================================================
   MathClass service worker
   - caches the app shell so the portal opens instantly and works offline
   - never caches the Apps Script API (POST requests always go to the network)
   Bump VERSION whenever index.html or the assets change.
   ========================================================================= */
const VERSION = 'v10.1.0';
const SHELL_CACHE = 'mathclass-shell-' + VERSION;
const RUNTIME_CACHE = 'mathclass-runtime';

const SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './assets/logo-96.png',
    './assets/logo-256.png',
    './assets/favicon.png',
    './assets/apple-touch-icon.png',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './assets/icon-maskable-512.png',
    './assets/campus.jpg',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css'
];

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(SHELL_CACHE);
        // add every entry separately: one bad URL must not break the whole install
        await Promise.all(SHELL.map(url =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
        ));
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(
            keys.filter(k => k.startsWith('mathclass-shell-') && k !== SHELL_CACHE)
                .map(k => caches.delete(k))
        );
        await self.clients.claim();
    })());
});

self.addEventListener('message', event => {
    if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;                       // API calls (POST) always hit the network

    let url;
    try { url = new URL(req.url); } catch (e) { return; }
    if (url.hostname === 'script.google.com') return;       // never cache classroom data

    /* --- page loads: network first, cached shell when offline --- */
    if (req.mode === 'navigate') {
        event.respondWith((async () => {
            const cache = await caches.open(SHELL_CACHE);
            try {
                const fresh = await fetch(req);
                if (fresh && fresh.ok) cache.put('./index.html', fresh.clone());
                return fresh;
            } catch (err) {
                return (await cache.match(req)) ||
                       (await cache.match('./index.html')) ||
                       (await cache.match('./')) ||
                       Response.error();
            }
        })());
        return;
    }

    /* --- same-origin files: instant from cache, refreshed in background --- */
    if (url.origin === location.origin) {
        event.respondWith((async () => {
            const cache = await caches.open(SHELL_CACHE);
            const cached = await cache.match(req);
            if (cached) {
                fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); }).catch(() => {});
                return cached;
            }
            try {
                const res = await fetch(req);
                if (res && res.ok) cache.put(req, res.clone());
                return res;
            } catch (err) {
                return cached || Response.error();
            }
        })());
        return;
    }

    /* --- CDN fonts and styles: serve cache, update quietly --- */
    event.respondWith((async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(req);
        const network = fetch(req)
            .then(res => {
                if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
                return res;
            })
            .catch(() => null);
        return cached || (await network) || Response.error();
    })());
});
