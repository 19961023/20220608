var CACHE_NAME = 'sewing-v4';
var CACHE_URLS = [
    'index.html',
    'manifest.json',
    'icon.svg',
    'icon-192.png',
    'icon-512.png'
];

self.addEventListener('install', function(e) {
    e.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
        return cache.addAll(CACHE_URLS);
    }));
});

self.addEventListener('activate', function(e) {
    e.waitUntil(caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
    }));
});

self.addEventListener('fetch', function(e) {
    e.respondWith(caches.match(e.request).then(function(response) {
        return response || fetch(e.request);
    }));
});
