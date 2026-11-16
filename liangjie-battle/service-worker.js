/**
 * service-worker.js
 *
 * Network-first service worker so updates take effect immediately after
 * deployment. Falls back to cache when offline.
 *
 * No build step, no Workbox, no dependencies.
 */
/* eslint-env serviceworker */
/* global self, caches, fetch */

const CACHE = 'survivor-v2.3.0';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './manifest.json',
    './src/main.js',
    './src/config.js',
    './src/data.js',
    './src/entities.js',
    './src/weapons.js',
    './src/systems.js',
    './src/effects.js',
    './src/audio.js',
    './src/input.js',
    './src/ui.js',
    './src/i18n.js',
    './src/storage.js',
    './src/achievements.js',
    './docs/hero.svg',
    './docs/og-card.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    // Only handle same-origin requests.
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Network-first for everything: always try the network first so deployments
    // take effect immediately; fall back to cache when offline.
    event.respondWith(
        fetch(req)
            .then((res) => {
                if (res && res.status === 200) {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put(req, copy));
                }
                return res;
            })
            .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
});
