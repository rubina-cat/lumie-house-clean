self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('push', event => {
  let title = '⚓ Anchor';
  let body = '找你了。';
  try {
    if (event.data) {
      const d = event.data.json();
      if (d.title) title = d.title;
      if (d.body) body = d.body;
    }
  } catch {}
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: 'anchor',
      renotify: true,
      vibrate: [200, 100, 200],
    })
  );
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
