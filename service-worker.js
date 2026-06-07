const CACHE_NAME='salary-tracker-v23';
const ASSETS=[
  './',
  './index.html',
  './assets/css/theme.css',
  './assets/css/style.css',
  './assets/js/app.js',
  './manifest.json',
  './version.json'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',event=>{
  if(event.data && event.data.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  event.respondWith(
    caches.match(event.request).then(cached=>cached || fetch(event.request).catch(()=>caches.match('./index.html')))
  );
});
