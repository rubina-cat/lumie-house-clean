self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    // 先檢查是否有新的語音指令
    try {
      const r = await fetch('/speak-latest');
      const { audioUrl } = await r.json();
      if (audioUrl) {
        const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const c of allClients) {
          c.postMessage({ type: 'play-audio', audioUrl });
        }
        if (allClients.length > 0) return; // PWA 開著，直接播，不彈通知
      }
    } catch {}

    // 沒有語音或 PWA 未開 → 彈通知
    let title = '⚓ Anchor';
    let body = '找你了。';
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
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('/chat-ui') && 'focus' in c) return c.focus();
      }
      return clients.openWindow('/chat-ui.html');
    })
  );
});
