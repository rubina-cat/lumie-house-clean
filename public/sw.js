self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let audioUrl = null;
    try {
      const r = await fetch('/speak-latest');
      audioUrl = (await r.json()).audioUrl || null;
    } catch {}

    if (audioUrl) {
      const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of all) c.postMessage({ type: 'play-audio', audioUrl });
    }

    let title = '⚓ Anchor';
    let body  = '找你了。';
    try {
      const nr = await fetch('/push-notification');
      const nd = await nr.json();
      if (nd.body) { title = nd.title || title; body = nd.body; }
    } catch {}
    try {
      if (event.data) {
        const d = event.data.json();
        if (d.title) title = d.title;
        if (d.body)  body  = d.body;
      }
    } catch {}

    const actions = [];
    if (audioUrl) actions.push({ action: 'play',  title: '🎵 聽他說' });
    actions.push(              { action: 'reply', title: '💬 回他' });

    await self.registration.showNotification(title, {
      body, tag: 'anchor', renotify: true, vibrate: [200, 100, 200],
      actions, data: { audioUrl },
    });

    try { await self.navigator.setAppBadge(1); } catch {}
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) c.postMessage({ type: 'set-badge', count: 1 });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const action   = event.action;
  const audioUrl = event.notification.data?.audioUrl || null;

  event.waitUntil((async () => {
    let playUrl = audioUrl;
    if (!playUrl) {
      try {
        const r = await fetch('/speak-latest');
        playUrl = (await r.json()).audioUrl || null;
      } catch {}
    }

    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const chatClient = allClients.find(c => c.url.includes('/chat-ui'));

    if (action === 'play' && playUrl) {
      if (chatClient) {
        chatClient.postMessage({ type: 'play-audio', audioUrl: playUrl });
        return chatClient.focus();
      }
      return clients.openWindow('/chat-ui.html?autoplay=' + encodeURIComponent(playUrl));
    }

    if (chatClient) {
      if (action === 'reply') chatClient.postMessage({ type: 'focus-input' });
      return chatClient.focus();
    }

    if (action === 'reply') return clients.openWindow('/chat-ui.html?reply=1');
    return clients.openWindow(playUrl ? '/player' : '/chat-ui.html');
  })());
});
