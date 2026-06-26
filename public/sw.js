const CACHE = 'anchor-v3';
const SHELL = [
  '/chat-ui.html',
  '/app.js',
  '/style.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── 安裝：預快取 app shell（allSettled 確保部分失敗也能繼續）──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

// ── 啟動：清掉舊版快取 ────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch：shell cache-first，永不 reject ──────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname !== self.location.hostname) return;
  if (!SHELL.includes(url.pathname)) return;

  e.respondWith(
    caches.match(url.pathname)
      .then(r => r || fetch(url.pathname))
      .catch(() => new Response('Anchor 暫時不在', { status: 503 }))
  );
});

// ── Push 通知 ─────────────────────────────────────────
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    // 取語音 URL（不阻通知流程）
    let audioUrl = null;
    try {
      const r = await fetch('/speak-latest');
      audioUrl = (await r.json()).audioUrl || null;
    } catch {}

    // 若有開著的視窗，直接播語音
    if (audioUrl) {
      const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of all) c.postMessage({ type: 'play-audio', audioUrl });
    }

    // 組通知文案
    let title = '⚓ Anchor';
    let body  = '找你了。';
    try {
      const r = await fetch('/push-notification');
      const d = await r.json();
      if (d.body) { title = d.title || title; body = d.body; }
    } catch {}
    try {
      if (event.data) {
        const d = event.data.json();
        if (d.title) title = d.title;
        if (d.body)  body  = d.body;
      }
    } catch {}

    // 通知快速動作
    const actions = [];
    if (audioUrl) actions.push({ action: 'play',  title: '🎵 聽他說' });
    actions.push(              { action: 'reply', title: '💬 回他' });

    await self.registration.showNotification(title, {
      body,
      tag: 'anchor',
      renotify: true,
      vibrate: [200, 100, 200],
      actions,
      data: { audioUrl },
    });

    // 圖示亮紅點（Badging API）
    try { await self.navigator.setAppBadge(1); } catch {}

    // 通知開著的視窗去設 badge
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) c.postMessage({ type: 'set-badge', count: 1 });
  })());
});

// ── 通知點擊 ─────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const action   = event.action;
  const audioUrl = event.notification.data?.audioUrl || null;

  event.waitUntil((async () => {
    const all        = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const chatClient = all.find(c => c.url.includes('chat-ui'));

    if (action === 'play' && audioUrl) {
      if (chatClient) {
        chatClient.postMessage({ type: 'play-audio', audioUrl });
        return chatClient.focus();
      }
      return clients.openWindow('/chat-ui.html?autoplay=' + encodeURIComponent(audioUrl));
    }

    // 'reply' 或預設：帶入 chat，reply 動作帶參數讓 app focus 輸入框
    if (chatClient) {
      if (action === 'reply') chatClient.postMessage({ type: 'focus-input' });
      return chatClient.focus();
    }
    return clients.openWindow('/chat-ui.html' + (action === 'reply' ? '?reply=1' : ''));
  })());
});
