const CACHE = 'anchor-v2';
const PRECACHE = ['/chat-ui.html', '/app.js', '/style.css', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    // 有語音就送 postMessage 給開著的 PWA（播音訊），但不阻止彈通知
    try {
      const r = await fetch('/speak-latest');
      const { audioUrl } = await r.json();
      if (audioUrl) {
        const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const c of allClients) {
          c.postMessage({ type: 'play-audio', audioUrl });
        }
      }
    } catch {}

    // 永遠彈通知（這樣點通知就能進 /player）
    let title = '⚓ Anchor';
    let body = '找你了。';
    try {
      const nr = await fetch('/push-notification');
      const nd = await nr.json();
      if (nd.body) { title = nd.title || title; body = nd.body; }
    } catch {}
    try {
      if (event.data) {
        const d = event.data.json();
        if (d.title) title = d.title;
        if (d.body) body = d.body;
      }
    } catch {}
    await self.registration.showNotification(title, {
      body, tag: 'anchor', renotify: true, vibrate: [200, 100, 200],
    });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    let playUrl = null;
    try {
      const r = await fetch('/speak-latest');
      const { audioUrl } = await r.json();
      if (audioUrl) playUrl = audioUrl;
    } catch {}

    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of allClients) {
      if (c.url.includes('/chat-ui')) {
        if (playUrl) c.postMessage({ type: 'play-audio', audioUrl: playUrl });
        c.focus();
        return;
      }
    }
    const target = playUrl ? '/player' : '/chat-ui.html';
    clients.openWindow(target);
  })());
});
