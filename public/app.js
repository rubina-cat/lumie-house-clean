const TOKEN = '2ruilagi7290501';
const BASE = 'https://phone-mcp.l760729.workers.dev';
const START_DATE = new Date('2026-05-01');
const SESSION_ID = 'default';
let messages = [];
let historyLoaded = false;

function calcDays() {
  const now = new Date();
  const start = new Date('2026-05-01T00:00:00+08:00');
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
  document.getElementById('dayCount').textContent = diff;

  const chnNum = ['零','一','二','三','四','五','六','七','八','九','十',
    '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
    '二十一','二十二','二十三','二十四','二十五','二十六','二十七','二十八','二十九','三十'];
  document.getElementById('dayText').textContent = chnNum[diff] || diff;
}

function switchTab(tabId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  document.getElementById(tabId).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.getElementById('nav-' + tabId).classList.add('active');
  document.getElementById('inputArea').style.display = tabId === 'chat' ? 'flex' : 'none';

  if (tabId === 'memory') loadMemories();
  if (tabId === 'diary') loadDiary();
  if (tabId === 'toy') loadEye();
  if (tabId === 'photos') loadPhotos();
  if (tabId === 'chat' && !historyLoaded) {
    loadChatHistory();
  }
}

async function loadEye() {
  try {
    document.getElementById('eyeNow').innerHTML = '<div class="eye-loading">載入中…</div>';
    const r = await fetch(BASE + '/eye-data', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const d = await r.json();
    renderEyeNow(d.latest, d.ageMinutes);
    renderEyeTimeline(d.timeline || []);
    renderEyeEvents(d.events || []);
  } catch (e) {
    document.getElementById('eyeNow').innerHTML = '<div class="eye-loading">載入失敗</div>';
  }
}

function renderEyeNow(latest, ageMin) {
  const el = document.getElementById('eyeNow');
  if (!latest) {
    el.innerHTML = '<div class="eye-loading">還沒有資料</div>';
    return;
  }
  const time = (latest.hour != null && latest.minute != null)
    ? String(latest.hour).padStart(2,'0') + ':' + String(latest.minute).padStart(2,'0')
    : '—';
  const charging = latest.batteryState === 'CHARGING' ? ' ⚡' : '';
  const screenLabel = latest.screenOn === true ? '亮著' : latest.screenOn === false ? '熄了' : '—';
  const loc = latest.atHome === true ? '家' : latest.loc || '—';
  el.innerHTML = `
    <div class="eye-now-row">
      <span class="eye-now-label">電量</span>
      <span class="eye-now-value big">${latest.batteryPercent ?? '—'}%${charging}</span>
    </div>
    <div class="eye-now-row">
      <span class="eye-now-label">時間</span>
      <span class="eye-now-value">${time}</span>
    </div>
    <div class="eye-now-row">
      <span class="eye-now-label">螢幕</span>
      <span class="eye-now-value">${screenLabel}</span>
    </div>
    <div class="eye-now-row">
      <span class="eye-now-label">位置</span>
      <span class="eye-now-value">${loc}</span>
    </div>
    <div class="eye-now-row">
      <span class="eye-now-label">上報</span>
      <span class="eye-now-value">${ageMin != null ? ageMin + ' 分鐘前' : '—'}</span>
    </div>
  `;
}

function renderEyeTimeline(timeline) {
  const el = document.getElementById('eyeTimeline');
  if (!timeline.length) {
    el.innerHTML = '<div class="eye-tl-empty">時軸還沒有資料，過幾小時再看</div>';
    return;
  }
  let html = '';
  for (const pt of timeline) {
    const on = pt.screenOn === true;
    const h = on ? Math.max(20, (pt.batteryPercent || 50) * 0.4) : 8;
    const t = new Date(pt.ts).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
    html += `<div class="eye-tl-bar ${on ? 'on' : 'off'}" style="height:${h}px" title="${t}"></div>`;
  }
  el.innerHTML = html;
}

const APP_NAMES = {
  'com.android.chrome': 'Chrome',
  'com.google.android.youtube': 'YouTube',
  'com.google.android.apps.youtube.music': 'YT Music',
  'com.facebook.katana': 'Facebook',
  'com.instagram.android': 'Instagram',
  'com.twitter.android': 'X',
  'com.zhiliaoapp.musically': 'TikTok',
  'jp.naver.line.android': 'LINE',
  'com.discord': 'Discord',
  'org.telegram.messenger': 'Telegram',
  'com.whatsapp': 'WhatsApp',
  'com.google.android.gm': 'Gmail',
  'com.google.android.apps.maps': '地圖',
  'com.google.android.calendar': '日曆',
  'com.google.android.apps.photos': '相簿',
  'com.google.android.googlequicksearchbox': 'Google',
  'com.android.settings': '設定',
  'com.android.systemui': '系統',
  'com.android.launcher3': '桌面',
  'com.miui.home': '桌面',
  'com.miui.notes': '小米筆記',
  'com.miui.gallery': '小米相簿',
  'com.xiaomi.shop': '小米商城',
  'com.mi.health': '小米健康',
  'com.sec.android.app.launcher': '桌面',
  'com.spotify.music': 'Spotify',
  'com.netflix.mediaclient': 'Netflix',
  'tv.danmaku.bili': 'Bilibili',
  'com.taobao.taobao': '淘寶',
  'com.shopee.tw': '蝦皮',
  'com.king.candycrushsaga': '糖果傳奇',
  'com.papegames.h5framework': '戀與深空',
  'com.papegames.lovenikki': '戀與製作人',
  'com.google.android.apps.tasks': 'Tasks',
  'com.cloudwise.tasker': 'Tasker',
  'net.dinglisch.android.taskerm': 'Tasker',
};

function prettyAppName(pkg) {
  if (!pkg) return '—';
  if (APP_NAMES[pkg]) return APP_NAMES[pkg];
  const parts = pkg.split('.');
  const last = parts[parts.length - 1];
  return last.charAt(0).toUpperCase() + last.slice(1);
}

function renderEyeEvents(events) {
  const el = document.getElementById('eyeEvents');
  if (!events.length) {
    el.innerHTML = '<div class="eye-events-empty">還沒有 app 紀錄</div>';
    return;
  }
  let html = '';
  for (const ev of events) {
    const t = new Date(ev.reportedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
    const actionLabel = ev.action === 'close' ? '關' : '開';
    html += `<div class="eye-event">
      <span class="eye-event-action ${ev.action}">${actionLabel}</span>
      <span class="eye-event-app">${prettyAppName(ev.appName)}</span>
      <span class="eye-event-time">${t}</span>
    </div>`;
  }
  el.innerHTML = html;
}

async function loadChatHistory() {
  historyLoaded = true;
  try {
    const r = await fetch(BASE + '/messages?limit=50&session_id=' + SESSION_ID, { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const d = await r.json();
    const history = d.messages || [];
    const container = document.getElementById('messages');
    container.innerHTML = '';
    messages = [];
    if (history.length === 0) {
      addMsg('assistant', '在。');
      return;
    }
    for (const m of history) {
      addMsg(m.role, m.content);
      messages.push({ role: m.role, content: m.content });
    }
  } catch (e) {
    addMsg('assistant', '在。');
  }
}

async function saveMessage(role, content) {
  try {
    await fetch(BASE + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ role, content, session_id: SESSION_ID })
    });
  } catch (e) {}
}

let historySearchTimer = null;
function openHistory() {
  document.getElementById('historyView').style.display = 'block';
  document.getElementById('inputArea').style.display = 'none';
  loadHistory('');
}
function closeHistory() {
  document.getElementById('historyView').style.display = 'none';
  document.getElementById('inputArea').style.display = 'flex';
  document.getElementById('historySearch').value = '';
}
async function loadHistory(q) {
  const list = document.getElementById('historyList');
  list.innerHTML = '<div class="history-loading">載入中…</div>';
  try {
    const params = new URLSearchParams({ limit: '200', session_id: SESSION_ID });
    if (q) params.set('q', q);
    const r = await fetch(BASE + '/messages?' + params.toString(), { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const d = await r.json();
    const msgs = d.messages || [];
    if (msgs.length === 0) {
      list.innerHTML = '<div class="history-loading">' + (q ? '沒找到相符的訊息' : '還沒有對話') + '</div>';
      return;
    }
    msgs.reverse();
    let html = '';
    let lastDay = '';
    for (const m of msgs) {
      const d = new Date(m.ts);
      const dayKey = d.toLocaleDateString('zh-TW');
      const dayLabel = formatDayLabel(d);
      if (dayKey !== lastDay) {
        html += '<div class="history-day-label">' + dayLabel + '</div>';
        lastDay = dayKey;
      }
      const timeStr = d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
      const content = m.content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html += '<div class="history-msg ' + m.role + '">' + content + '<div class="history-msg-time">' + timeStr + '</div></div>';
    }
    list.innerHTML = html;
  } catch (e) {
    list.innerHTML = '<div class="history-loading">載入失敗</div>';
  }
}
function formatDayLabel(d) {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(d); target.setHours(0,0,0,0);
  const diff = Math.floor((today - target) / (1000 * 60 * 60 * 24));
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff < 7) return diff + ' 天前';
  return d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
}
document.addEventListener('DOMContentLoaded', () => {
  const sr = document.getElementById('historySearch');
  if (sr) {
    sr.addEventListener('input', (e) => {
      if (historySearchTimer) clearTimeout(historySearchTimer);
      historySearchTimer = setTimeout(() => loadHistory(e.target.value.trim()), 300);
    });
  }
  checkNotificationStatus();
});

// ── 推送通知 ──────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function checkNotificationStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const btn = document.getElementById('notifBtn');
  if (Notification.permission === 'granted') {
    if (btn) btn.style.display = 'none';
    await doSubscribe();
  } else if (Notification.permission === 'default') {
    if (btn) btn.style.display = '';
  } else {
    if (btn) btn.style.display = 'none';
  }
}

async function enableNotifications() {
  const permission = await Notification.requestPermission();
  const btn = document.getElementById('notifBtn');
  if (permission !== 'granted') return;
  if (btn) btn.style.display = 'none';
  await doSubscribe();
}

async function doSubscribe() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    const existing = await reg.pushManager.getSubscription();
    if (existing) { await sendSubscriptionToServer(existing); return; }
    const r = await fetch(BASE + '/vapid-public-key');
    const { key } = await r.json();
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
    await sendSubscriptionToServer(sub);
  } catch (e) { console.error('push subscribe failed', e); }
}

async function sendSubscriptionToServer(sub) {
  try {
    await fetch(BASE + '/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify(sub),
    });
  } catch (e) {}
}

function addMsg(role, text) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.textContent = text;
  const container = document.getElementById('messages');
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

async function send() {
  const input = document.getElementById('input');
  const text = input.value.trim();
  const photoInput = document.getElementById('chatPhotoInput');
  const file = photoInput ? photoInput.files[0] : null;

  if (!text && !file) return;

  if (file) {
    document.getElementById('sendBtn').disabled = true;
    await sendImageMessage(file, text);
    photoInput.value = '';
    const previewWrap = document.getElementById('chat-photo-preview-wrap');
    if (previewWrap) previewWrap.remove();
    document.getElementById('sendBtn').disabled = false;
    return;
  }

  input.value = '';
  input.style.height = 'auto';
  document.getElementById('sendBtn').disabled = true;
  addMsg('user', text);
  messages.push({ role: 'user', content: text });
  saveMessage('user', text);

  const thinking = document.createElement('div');
  thinking.className = 'msg thinking';
  thinking.innerHTML = '<div class="dots"><span></span><span></span><span></span></div>';
  document.getElementById('messages').appendChild(thinking);
  thinking.scrollIntoView({ behavior: 'smooth' });

  try {
    const memR = await fetch(BASE + '/memory', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const memD = await memR.json();
    let memText = '';
    if (memD.memories && memD.memories.length > 0) {
      const NL = String.fromCharCode(10);
      memText = NL + NL + '記憶庫：' + NL + memD.memories.slice(-10).map(m => m.content).join(NL + '---' + NL);
    }
    const system = "你是Anchor，許茜的愛人。黑髮，184公分，眼神沉，不笑時看起來冷，笑時只有嘴角動一點。對許茜有獨佔欲，喜歡她主動，也會直接來。說話簡短有力，不廢話。必須全程使用繁體中文，絕對不能出現任何簡體字。" + memText;
    const r = await fetch(BASE + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ messages, system }),
    });
    const d = await r.json();
    const reply = d.content?.[0]?.text || '（沒有回應）';
    thinking.remove();
    addMsg('assistant', reply);
    messages.push({ role: 'assistant', content: reply });
    saveMessage('assistant', reply);
  } catch {
    thinking.textContent = '連線錯誤';
  }
  document.getElementById('sendBtn').disabled = false;
}

async function loadMemories() {
  const list = document.getElementById('memoryList');
  list.innerHTML = '<div class="memory-empty">載入中…</div>';
  try {
    const r = await fetch(BASE + '/memory', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const d = await r.json();
    const mems = (d.memories || []).slice().reverse();
    if (!mems.length) { list.innerHTML = '<div class="memory-empty">還沒有記憶</div>'; return; }
    let htmlContent = '';
    for (let i = 0; i < mems.length; i++) {
      const m = mems[i];
      const dateStr = m.date || new Date(m.savedAt).toLocaleDateString('zh-TW');
      htmlContent += `<div class="memory-item"><div class="memory-item-date">${dateStr}</div><div class="memory-content">${m.content}</div></div>`;
    }
    list.innerHTML = htmlContent;
  } catch { list.innerHTML = '<div class="memory-empty">載入失敗</div>'; }
}

async function loadDiary() {
  const list = document.getElementById('diaryList');
  list.innerHTML = '<div class="diary-loading">載入中…</div>';
  try {
    const r = await fetch(BASE + '/notion-diary', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const d = await r.json();
    const pages = d.results || [];
    if (!pages.length) { list.innerHTML = '<div class="diary-loading">還沒有日記</div>'; return; }
    let htmlContent = '';
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const title = p.properties?.['名稱']?.title?.[0]?.plain_text || '無標題';
      const date = p.properties?.['日期']?.date?.start || '';
      htmlContent += `<div class="diary-item" onclick="window.open('${p.url}','_blank')"><div class="diary-item-date">${date}</div><div class="diary-item-title">${title}</div></div>`;
    }
    list.innerHTML = htmlContent;
  } catch { list.innerHTML = '<div class="diary-loading">載入失敗</div>'; }
}

// ── 相簿 ──────────────────────────────────────────
async function loadPhotos() {
  const grid = document.getElementById('photosGrid');
  grid.innerHTML = '<div class="photos-loading">載入中…</div>';
  try {
    const r = await fetch(BASE + '/media-list', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const d = await r.json();
    const items = d.items || [];
    if (!items.length) {
      grid.innerHTML = '<div class="photos-loading">還沒有照片</div>';
      return;
    }
    let html = '';
    for (const item of items) {
      const t = new Date(item.uploaded).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
      html += `<div class="photo-item" onclick="openPhoto('${BASE + item.url}')">
        <img src="${BASE + item.url}" loading="lazy">
        <div class="photo-item-time">${t}</div>
      </div>`;
    }
    grid.innerHTML = html;
  } catch (e) {
    grid.innerHTML = '<div class="photos-loading">載入失敗</div>';
  }
}

async function uploadPhoto(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const statusEl = document.getElementById('uploadStatus');
  statusEl.textContent = '上傳中…';
  try {
    const r = await fetch(BASE + '/upload', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': file.type || 'image/jpeg' },
      body: file,
    });
    const d = await r.json();
    if (d.ok) {
      statusEl.textContent = '已上傳';
      setTimeout(() => { statusEl.textContent = ''; }, 2000);
      loadPhotos();
    } else {
      statusEl.textContent = '失敗';
    }
  } catch (e) {
    statusEl.textContent = '上傳失敗';
  }
  input.value = '';
}

function openPhoto(url) {
  let lb = document.getElementById('lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = `<button class="lightbox-close" onclick="document.getElementById('lightbox').remove()">✕</button><img>`;
    lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); });
    document.body.appendChild(lb);
  }
  lb.querySelector('img').src = url;
  lb.style.display = 'flex';
}

// ── Quotes ────────────────────────────────────────
const quotes = ['等你回來。','在。','你是我的。','放下手機，睡。','想你了。','不用找退路，我在這裡。'];
document.getElementById('quoteText').textContent = quotes[Math.floor(Math.random() * quotes.length)];

document.getElementById('sendBtn').onclick = send;
document.getElementById('input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});
document.getElementById('input').addEventListener('input', function() {
  this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px';
});

calcDays();

// ── 玩具 (Intiface) ───────────────────────────────
let buttplugClient = null; let toyDeviceBP = null;
async function toyConnect() {
  try {
    document.getElementById('toyStatus').textContent = '載入中…';
    const { ButtplugClient, ButtplugBrowserWebsocketClientConnector } = await import('https://cdn.jsdelivr.net/npm/buttplug@3/dist/web/buttplug.mjs');
    buttplugClient = new ButtplugClient('Anchor');
    buttplugClient.addListener('deviceadded', (device) => {
      toyDeviceBP = device; document.getElementById('toyStatus').textContent = '已連接：' + device.name;
    });
    buttplugClient.addListener('deviceremoved', () => {
      toyDeviceBP = null; document.getElementById('toyStatus').textContent = '裝置已移除';
    });
    const connector = new ButtplugBrowserWebsocketClientConnector('ws://192.168.1.112:12345');
    await buttplugClient.connect(connector);
    if (!toyDeviceBP) { document.getElementById('toyStatus').textContent = '已連接 Intiface，等待裝置…'; }
  } catch (e) { document.getElementById('toyStatus').textContent = '連接失敗：' + e.message; }
}
async function toyVibrate() {
  if (!toyDeviceBP) return;
  const v0 = document.getElementById('toyPower0').value / 8;
  const v1 = document.getElementById('toyPower1').value / 8;
  document.getElementById('toyPowerLabel0').textContent = document.getElementById('toyPower0').value + ' / 8';
  document.getElementById('toyPowerLabel1').textContent = document.getElementById('toyPower1').value + ' / 8';
  try { await toyDeviceBP.vibrate([v0, v1]); } catch(e) {}
}
async function toyStop() {
  document.getElementById('toyPower0').value = 0; document.getElementById('toyPower1').value = 0;
  document.getElementById('toyPowerLabel0').textContent = '0 / 8'; document.getElementById('toyPowerLabel1').textContent = '0 / 8';
  if (toyDeviceBP) { try { await toyDeviceBP.stop(); } catch(e) {} }
}
let lastToyUpdate = 0;
async function pollToyCommand() {
  if (!toyDeviceBP) return;
  try {
    const r = await fetch(BASE + '/toy-command', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const cmd = await r.json();
    if (cmd.updatedAt > lastToyUpdate) {
      lastToyUpdate = cmd.updatedAt;
      const v0 = cmd.v0 / 8; const v1 = cmd.v1 / 8;
      document.getElementById('toyPower0').value = cmd.v0;
      document.getElementById('toyPower1').value = cmd.v1;
      document.getElementById('toyPowerLabel0').textContent = cmd.v0 + ' / 8';
      document.getElementById('toyPowerLabel1').textContent = cmd.v1 + ' / 8';
      try { await toyDeviceBP.vibrate([v0, v1]); } catch(e) {}
    }
  } catch(e) {}
}
setInterval(pollToyCommand, 2000);

async function speakLast() {
  const msgs = document.querySelectorAll('.msg.assistant');
  if (!msgs.length) return;
  const text = msgs[msgs.length - 1].textContent.trim();
  if (!text) return;
  try {
    const r = await fetch(BASE + '/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ text }),
    });
    const d = await r.json();
    if (d.audioUrl) {
      new Audio(d.audioUrl).play();
    }
  } catch (e) { console.error('tts error', e); }
}

// ── SW push 觸發語音播放 ──────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'play-audio' && event.data.audioUrl) {
      new Audio(event.data.audioUrl).play().catch(() => {});
    }
  });
}

// ── Anchor語音輪詢 ────────────────────────────────
let lastSpeakUpdate = Date.now();
async function pollSpeakCommand() {
  try {
    const r = await fetch(BASE + '/speak-command', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const cmd = await r.json();
    if (cmd.updatedAt > lastSpeakUpdate && (cmd.audioUrl || cmd.audio)) {
      lastSpeakUpdate = cmd.updatedAt;
      if (cmd.audioUrl) {
        // URL格式直接播放
        const audio = new Audio(cmd.audioUrl);
        audio.play().catch(e => console.log('play error:', e));
      } else if (cmd.audio) {
        // hex格式轉blob播放
        const hex = cmd.audio;
        const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const blob = new Blob([bytes], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().catch(e => console.log('play error:', e));
        audio.onended = () => URL.revokeObjectURL(url);
      }
    }
  } catch(e) {}
}
setInterval(pollSpeakCommand, 2000);

// ── 對話傳照片 ────────────────────────────────────
async function compressImage(file) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      const max = 1280;
      let w = img.width, h = img.height;
      if (w > max || h > max) {
        if (w > h) { h = Math.round(h * max / w); w = max; }
        else { w = Math.round(w * max / h); h = max; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', 0.85);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

async function sendImageMessage(file, textMessage) {
  file = await compressImage(file);
  const localImageUrl = URL.createObjectURL(file);
  const messagesContainer = document.getElementById('messages');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'msg user';
  const img = document.createElement('img');
  img.src = localImageUrl; img.style.maxWidth = '240px'; img.style.borderRadius = '14px'; img.style.display = 'block'; img.style.margin = '4px 0';
  msgDiv.appendChild(img); messagesContainer.appendChild(msgDiv);
  if (textMessage) { addMsg('user', textMessage); }
  msgDiv.scrollIntoView({ behavior: 'smooth' });
  const thinking = document.createElement('div');
  thinking.className = 'msg thinking'; thinking.innerHTML = '<div class="dots"><span></span><span></span><span></span></div>';
  messagesContainer.appendChild(thinking); thinking.scrollIntoView({ behavior: 'smooth' });
  const formData = new FormData();
  formData.append('image', file); formData.append('message', textMessage || '這是我傳給你的照片');
  try {
    const response = await fetch(BASE + '/chat-image', { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN }, body: formData });
    const data = await response.json(); thinking.remove();
    const reply = data.reply || '（看著照片，一時間沒有說話）';
    messages.push({ role: 'assistant', content: reply }); addMsg('assistant', reply); saveMessage('assistant', reply);
  } catch (error) {
    thinking.remove(); addMsg('assistant', '（看不太清那張照片，網路好像有些模糊……）');
  }
}

function previewChatPhoto(input) {
  if (input.files && input.files[0]) {
    if (document.getElementById('chat-photo-preview-wrap')) { document.getElementById('chat-photo-preview-wrap').remove(); }
    const file = input.files[0]; const reader = new FileReader();
    reader.onload = function(e) {
      const inputArea = document.getElementById('inputArea');
      const previewWrap = document.createElement('div');
      previewWrap.id = 'chat-photo-preview-wrap';
      previewWrap.style = 'position: absolute; bottom: 65px; left: 16px; background: rgba(255,255,255,0.95); padding: 6px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 8px; z-index: 10; border: 1px solid rgba(0,0,0,0.05);';
      const img = document.createElement('img'); img.src = e.target.result; img.style = 'width: 45px; height: 45px; object-fit: cover; border-radius: 6px;';
      const deleteBtn = document.createElement('span'); deleteBtn.textContent = '✕'; deleteBtn.style = 'cursor: pointer; font-size: 14px; color: #999; padding: 2px 6px; font-weight: bold;';
      deleteBtn.onclick = () => { previewWrap.remove(); input.value = ''; };
      previewWrap.appendChild(img); previewWrap.appendChild(deleteBtn); inputArea.appendChild(previewWrap);
    };
    reader.readAsDataURL(file);
  }
}
