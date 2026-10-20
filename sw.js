/* Ctônia — service worker (instalação + uso offline do portal) */
const VERSION = 'ctonia-v4';
const STATIC_HOSTS = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com', 'kit.fontawesome.com', 'use.fontawesome.com', 'ka-f.fontawesome.com'];
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Nunca interceptar login/APIs do Google (Drive, OAuth)
  if (/(^|\.)googleapis\.com$|accounts\.google\.com|apis\.google\.com|googleusercontent\.com/.test(url.hostname) && url.hostname !== 'fonts.googleapis.com') return;
  if (url.origin === location.origin) {
    // Rede primeiro (revalida no servidor, ignorando o cache de 10 min do GitHub Pages); cai para o cache se estiver offline
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./'))));
  } else if (STATIC_HOSTS.includes(url.hostname)) {
    // Bibliotecas e fontes: cache primeiro, atualiza em segundo plano
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
