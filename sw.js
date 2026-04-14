const CACHE_NAME = 'crewbus-v1';
const ASSETS = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com',
  './assets/crewtime.png',
  './assets/crewsleepy.png',
  './assets/crewmad.png',
  './assets/crewlost.png',
  './assets/crewhappy.png',
  './assets/crewrun.png'
];

// Instalación: Guardar archivos en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activación: Limpiar cachés antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Estrategia: Cache First, fallback to Network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
