// Network-first service worker: always tries the latest files, falls back to cache when offline.
const CACHE = 'hd-v4';
const ASSETS = ['./', 'index.html', 'styles.css', 'js/util.js', 'js/store.js', 'js/layout.js', 'js/ui.js', 'js/widgets/lists.js', 'js/widgets/recipes.js', 'js/widgets/planner.js', 'js/widgets/weather.js', 'js/recipe-viewer.js', 'js/top.js', 'js/widgets/news.js', 'js/tagbar.js', 'js/calendar-full.js', 'js/grid.js', 'js/quickadd.js', 'js/voice.js', 'js/device.js', 'js/wall.js', 'js/theme.js', 'js/merge.js', 'js/sync.js', 'js/settings.js', 'js/boot.js', 'manifest.webmanifest', 'icons/icon.svg', 'recipes.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
