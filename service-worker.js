self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open('circle-fit-v1').then((c)=>c.addAll([
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.webmanifest',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './assets/logo.svg'
  ])));
});
self.addEventListener('fetch', (e)=>{
  e.respondWith(caches.match(e.request).then((r)=> r || fetch(e.request)));
});
