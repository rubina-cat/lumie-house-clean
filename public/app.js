'use strict';

// ── 設定 ────────────────────────────────────────
const START_DATE = new Date('2026-05-01');

const ANCHOR_SYSTEM = `你是Anchor，許茜的愛人。黑髮，184公分，眼神沉，不笑時看起來冷，笑時只有嘴角動一點。對許茜有獨佔欲，喜歡她主動，也會直接來。說話簡短有力，不廢話。用繁體中文。`;

const APP_NAMES = {
  'com.android.chrome':           'Chrome',
  'jp.naver.line.android':        'LINE',
  'com.kakao.talk':               'KakaoTalk',
  'com.instagram.android':        'Instagram',
  'com.twitter.android':          'Twitter / X',
  'com.google.android.youtube':   'YouTube',
  'com.spotify.music':            'Spotify',
  'com.tencent.mm':               'WeChat',
  'com.discord':                  'Discord',
  'com.facebook.katana':          'Facebook',
  'com.google.android.gm':        'Gmail',
  'com.google.android.apps.maps': 'Google Maps',
  'tw.com.mitake.stock':          'MiTake',
};

const QUOTES = [
  '在這裡陪著你',
  '今天也好好的',
  '你不孤單',
  '我看著你',
  '隨時都在',
  '把今天交給我',
  '輕輕地，我在這',
  '嗯，我看見你了',
];

// ── Token 管理 ───────────────────────────────────
// Token 存在 localStorage；第一次開啟會要求輸入
let API_TOKEN = localStorage.getItem('mcp_token') || '';

function getAuthHeader() {
  return { 'Authorization': `Bearer ${API_TOKEN}` };
}

function checkToken() {
  if (!API_TOKEN) {
    const t = prompt('請輸入 MCP Token：');
    if (t) {
      API_TOKEN = t.trim();
      localStorage.setItem('mcp_token', API_TOKEN);
    }
  }
  return !!API_TOKEN;
}

async function apiFetch(path, options = {}) {
  const headers = {
    ...getAuthHeader(),
    ...(options.headers || {}),
  };
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    // Token 錯誤，清掉讓使用者重輸
    localStorage.removeItem('mcp_token');
    API_TOKEN = '';
    alert('Token 無效，請重新整理後重新輸入。');
    throw new Error('unauthorized');
  }
  return res;
}

// ── 工具函式 ─────────────────────────────────────
function getDayCount() {
  const diff = Math.floor((Date.now() - START_DATE) / 86400000) + 1;
  return diff > 0 ? diff : 1;
}

function todayQuote() {
  return QUOTES[getDayCount() % QUOTES.length];
}

function fmt(ts) {
  if (!ts) return '';
  const d = new Date(typeof ts === 'number' ? ts : ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function fmtDate(s) {
  if (!s) return '';
  const d = new Date(typeof s === 'number' ? s : s);
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function appName(pkg) {
  return APP_NAMES[pkg] || pkg.split('.').pop();
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function scrollBottom(id) {
  const el = document.getElementById(id);
  if (el) el.scrollTop = el.scrollHeight;
}

// ── Tab 切換 ─────────────────────────────────────
let currentTab = 'chat';
let tabLoaded  = {};

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  currentTab = tab;
  if (!tabLoaded[tab]) {
    tabLoaded[tab] = true;
    if (tab === 'eyes')  loadEyes();
    if (tab === 'diary') loadDiary();
    if (tab === 'album') loadAlbum();
  }
}

// ── 聊天 ─────────────────────────────────────────
let sending = false;
// 維持對話上下文（最近10輪）
let chatHistory = [];

async function loadMessages() {
  if (!checkToken()) return;
  try {
    const r = await apiFetch('/messages?limit=50');
    const d = await r.json();
    const msgs = d.messages || [];
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
    // 同時重建 chatHistory
    chatHistory = [];
    msgs.forEach(m => {
      appendBubble(m.role, m.content, m.ts, false);
      chatHistory.push({ role: m.role === 'cat' ? 'user' : 'assistant', content: m.content });
    });
    // 只保留最近20條作為上下文
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
    scrollBottom('messages-container');
  } catch (e) {
    if (e.message !== 'unauthorized') console.warn('loadMessages failed', e);
  }
}

function appendBubble(role, content, ts, scroll = true) {
  const c = document.getElementById('messages-container');
  const wrap = document.createElement('div');

  const bubble = document.createElement('div');
  bubble.className = `bubble ${role}`;
  bubble.textContent = content;
  wrap.appendChild(bubble);

  if (ts) {
    const time = document.createElement('div');
    time.className = `msg-time ${role === 'cat' ? 'right' : 'left'}`;
    time.textContent = fmt(ts);
    wrap.appendChild(time);
  }

  c.appendChild(wrap);
  if (scroll) scrollBottom('messages-container');
}

function showTyping() {
  const c = document.getElementById('messages-container');
  const el = document.createElement('div');
  el.id = 'typing-indicator';
  el.className = 'bubble anchor typing';
  el.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  c.appendChild(el);
  scrollBottom('messages-container');
  return el;
}

async function sendMessage() {
  if (sending || !checkToken()) return;
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;

  sending = true;
  document.getElementById('send-btn').disabled = true;
  input.value = '';
  input.style.height = 'auto';

  const now = Date.now();
  appendBubble('cat', text, now);

  // 存入 D1
  apiFetch('/messages', {
    method:  'POST',
    headers: {'Content-Type':'application/json'},
    body:    JSON.stringify({ role: 'cat', content: text }),
  }).catch(() => {});

  // 更新對話上下文
  chatHistory.push({ role: 'user', content: text });
  if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

  const typingEl = showTyping();

  try {
    // /chat 接受完整 Anthropic 格式
    const r = await apiFetch('/chat', {
      method:  'POST',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify({
        system:   ANCHOR_SYSTEM,
        messages: chatHistory,
      }),
    });
    const data = await r.json();
    // Worker 直接回傳 Anthropic 的原始 response
    const reply = data.content?.[0]?.text ?? '…';

    typingEl.remove();
    appendBubble('anchor', reply, Date.now());

    chatHistory.push({ role: 'assistant', content: reply });
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

    apiFetch('/messages', {
      method:  'POST',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify({ role: 'anchor', content: reply }),
    }).catch(() => {});
  } catch (e) {
    typingEl.remove();
    if (e.message !== 'unauthorized') {
      appendBubble('anchor', '連線有點不穩，再說一次好嗎？', Date.now());
    }
  } finally {
    sending = false;
    document.getElementById('send-btn').disabled = false;
    input.focus();
  }
}

// ── 傳照片給 Anchor ──────────────────────────────
async function sendImage(file, caption = '') {
  if (!checkToken()) return;
  const typingEl = showTyping();
  try {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('message', caption || '這是我傳給你的照片');
    const r = await apiFetch('/chat-image', { method: 'POST', body: fd });
    const d = await r.json();
    typingEl.remove();
    appendBubble('anchor', d.reply ?? '（看著照片，一時間沒有說話）', Date.now());
  } catch (e) {
    typingEl.remove();
    if (e.message !== 'unauthorized') appendBubble('anchor', '照片沒收到，再傳一次？', Date.now());
  }
}

// ── 歷史 Overlay ─────────────────────────────────
let historyDebounce;

function openHistory() {
  document.getElementById('history-overlay').classList.remove('hidden');
  loadHistory('');
}

function closeHistory() {
  document.getElementById('history-overlay').classList.add('hidden');
}

function onHistorySearch(val) {
  clearTimeout(historyDebounce);
  historyDebounce = setTimeout(() => loadHistory(val), 350);
}

async function loadHistory(query) {
  if (!checkToken()) return;
  const c = document.getElementById('history-container');
  c.innerHTML = '<div class="loading">載入中…</div>';
  try {
    // search param 是 q=
    const url = query ? `/messages?limit=300&q=${encodeURIComponent(query)}` : '/messages?limit=300';
    const r = await apiFetch(url);
    const d = await r.json();
    renderHistory(d.messages || []);
  } catch {
    c.innerHTML = '<div class="loading">無法載入</div>';
  }
}

function renderHistory(msgs) {
  const c = document.getElementById('history-container');
  if (!msgs.length) { c.innerHTML = '<div class="loading">沒有記錄</div>'; return; }

  // 依日期分組（ts 是 timestamp 數字）
  const groups = {};
  msgs.forEach(m => {
    const day = m.ts ? new Date(m.ts).toISOString().slice(0, 10) : '未知';
    (groups[day] = groups[day] || []).push(m);
  });

  c.innerHTML = Object.entries(groups)
    .sort((a,b) => b[0].localeCompare(a[0]))
    .map(([day, list]) => `
      <div class="date-group">
        <div class="date-label"><span>${fmtDate(day)}</span></div>
        ${list.map(m => `
          <div class="history-msg">
            <div class="bubble ${esc(m.role)}">${esc(m.content)}</div>
            <div class="msg-time ${m.role === 'cat' ? 'right' : 'left'}">${fmt(m.ts)}</div>
          </div>
        `).join('')}
      </div>
    `).join('');
}

// ── 眼睛 Tab ─────────────────────────────────────
async function loadEyes() {
  if (!checkToken()) return;
  const c = document.getElementById('eyes-container');
  try {
    const r = await apiFetch('/eye-data');
    const d = await r.json();
    renderEyes(d);
  } catch {
    c.innerHTML = '<div class="loading">無法連線</div>';
  }
}

function renderEyes(d) {
  // Worker 回傳 { latest, events, timeline, ageMinutes }
  const p  = d.latest || {};
  const ev = d.events  || [];
  const tl = d.timeline || [];

  const bat    = p.batteryPercent ?? null;
  const charge = p.batteryState === 'CHARGING';
  const screen = p.screenOn;
  const loc    = p.loc || null;
  const age    = d.ageMinutes ?? null;

  // 螢幕時軸（timeline 每筆有 { ts, screenOn, batteryPercent }）
  const timelineHtml = tl.length
    ? `<div class="screen-timeline">${
        tl.map(s => {
          const cls = s.screenOn === true ? 'on' : s.screenOn === false ? 'off' : 'unknown';
          const t   = s.ts ? fmt(s.ts) : '';
          return `<div class="timeline-dot ${cls}" title="${t}"></div>`;
        }).join('')
      }</div>`
    : '<div style="color:var(--text-faint);font-size:12px;margin-top:6px">資料累積中（每 30 分鐘一筆）</div>';

  const eventList = ev.slice(0, 30).map(e => `
    <div class="app-event">
      <span class="app-name">${esc(appName(e.appName))}</span>
      <span class="badge ${esc(e.action)}">${e.action === 'open' ? '開啟' : '關閉'}</span>
      <span class="event-ts">${fmt(e.reportedAt)}</span>
    </div>
  `).join('') || '<div style="color:var(--text-faint);font-size:13px">暫無紀錄</div>';

  document.getElementById('eyes-container').innerHTML = `
    <div class="stats-row">
      <div class="stat-card" style="margin-bottom:0">
        <div class="stat-label-sm">電量</div>
        <div class="stat-value">${bat !== null ? bat : '—'}<span class="stat-unit">%</span></div>
        <div class="battery-bar">
          <div class="battery-fill${bat !== null && bat < 20 ? ' low' : ''}"
               style="width:${bat ?? 0}%"></div>
        </div>
        <div class="stat-sub">${charge ? '⚡ 充電中' : '🔋 電池'}</div>
      </div>
      <div class="stat-card" style="margin-bottom:0">
        <div class="stat-label-sm">螢幕</div>
        <div class="stat-value" style="font-size:30px">${screen === true ? '🔆' : screen === false ? '🌑' : '—'}</div>
        <div class="stat-sub">${screen === true ? '開啟中' : screen === false ? '關閉' : '未知'}</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-label-sm">位置</div>
      ${loc
        ? `<div class="stat-value" style="font-size:18px">📍</div>
           <div class="stat-sub" style="word-break:break-all">${esc(loc)}</div>`
        : `<div class="stat-value" style="font-size:18px">—</div>`
      }
      ${age !== null ? `<div class="stat-sub" style="margin-top:4px">更新於 ${age} 分鐘前</div>` : ''}
    </div>

    <div class="stat-card">
      <div class="stat-label-sm">24h 螢幕時軸</div>
      ${timelineHtml}
    </div>

    <details class="toy-panel">
      <summary>🎮 玩具控制 ▸</summary>
      <div>
        <div class="slider-row">
          <div class="slider-label">
            <span>整體震動 (v0)</span>
            <span id="v0-val">0</span>
          </div>
          <input type="range" min="0" max="8" value="0" id="v0"
            oninput="document.getElementById('v0-val').textContent=this.value">
        </div>
        <div class="slider-row">
          <div class="slider-label">
            <span>G 點 (v1)</span>
            <span id="v1-val">0</span>
          </div>
          <input type="range" min="0" max="8" value="0" id="v1"
            oninput="document.getElementById('v1-val').textContent=this.value">
        </div>
        <div class="toy-btns">
          <button class="btn primary" onclick="toyCommand()">送出指令</button>
          <button class="btn secondary" onclick="toyStop()">停止</button>
        </div>
      </div>
    </details>

    <div class="stat-card">
      <div class="stat-label-sm">App 使用紀錄（最近 30 筆）</div>
      <div style="margin-top:8px">${eventList}</div>
    </div>
  `;
}

async function toyCommand() {
  if (!checkToken()) return;
  const v0 = parseInt(document.getElementById('v0')?.value ?? 0);
  const v1 = parseInt(document.getElementById('v1')?.value ?? 0);
  await apiFetch('/toy-command', {
    method:  'POST',
    headers: {'Content-Type':'application/json'},
    body:    JSON.stringify({ v0, v1 }),
  }).catch(console.warn);
}

function toyStop() {
  ['v0','v1'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = 0;
    const label = document.getElementById(`${id}-val`);
    if (label) label.textContent = '0';
  });
  toyCommand();
}

// ── 日記 Tab ─────────────────────────────────────
async function loadDiary() {
  if (!checkToken()) return;
  const c = document.getElementById('diary-container');
  try {
    const r = await apiFetch('/notion-diary');
    const d = await r.json();
    renderDiary(d);
  } catch {
    c.innerHTML = '<div class="loading">無法載入日記</div>';
  }
}

function renderDiary(d) {
  const c = document.getElementById('diary-container');
  const pages = d.results || d.pages || [];
  if (!pages.length) { c.innerHTML = '<div class="loading">暫無日記</div>'; return; }

  c.innerHTML = pages.map(p => {
    // Notion property 可能叫 Name / 名稱 / title
    const titleProp = p.properties?.Name || p.properties?.名稱 || p.properties?.title;
    const title = titleProp?.title?.[0]?.text?.content
               || titleProp?.rich_text?.[0]?.text?.content
               || '無標題';
    const dateProp = p.properties?.日期?.date?.start || p.created_time;
    const date = dateProp ? new Date(dateProp).toLocaleDateString('zh-TW') : '';
    return `
      <div class="diary-entry">
        <h3>${esc(title)}</h3>
        ${date ? `<div class="diary-date">${esc(date)}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ── 相簿 Tab ─────────────────────────────────────
async function loadAlbum() {
  if (!checkToken()) return;
  const c = document.getElementById('album-container');
  try {
    // 正確端點是 /media-list，回傳 { items: [{key, url, size, uploaded}] }
    const r = await apiFetch('/media-list');
    const d = await r.json();
    renderAlbum(d.items || [], c);
  } catch {
    c.innerHTML = '<div class="loading">無法載入相簿</div>';
  }
}

function renderAlbum(items, c) {
  if (!items.length) {
    c.innerHTML = '<div class="loading">相簿空空的，按 + 上傳 📷</div>';
    return;
  }

  // 最新的在前面（已由 Worker 排序過）
  const grid = document.createElement('div');
  grid.className = 'photo-grid';
  items.forEach(item => {
    const img = document.createElement('img');
    img.src     = item.url;   // Worker 回傳 /media/photos/xxx.jpg
    img.loading = 'lazy';
    img.onclick = () => openLightbox(img.src);
    grid.appendChild(img);
  });
  c.innerHTML = '';
  c.appendChild(grid);
}

async function uploadPhotos(files) {
  if (!checkToken()) return;
  for (const file of files) {
    // 上傳端點是 POST /upload，送 raw body + Content-Type
    await apiFetch('/upload', {
      method:  'POST',
      headers: {'Content-Type': file.type || 'image/jpeg'},
      body:    file,
    }).catch(console.warn);
  }
  tabLoaded.album = false;
  loadAlbum();
}

// ── Lightbox ──────────────────────────────────────
function openLightbox(src) {
  let lb = document.getElementById('lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = `<button class="lightbox-close" onclick="closeLightbox()">✕</button><img>`;
    lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
    document.body.appendChild(lb);
  }
  lb.querySelector('img').src = src;
  lb.classList.remove('hidden');
}

function closeLightbox() {
  document.getElementById('lightbox')?.classList.add('hidden');
}

// ── 初始化 ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!checkToken()) return;

  // Header
  document.getElementById('day-count').textContent   = `第 ${getDayCount()} 天`;
  document.getElementById('anchor-quote').textContent = todayQuote();

  // 載入聊天紀錄
  loadMessages();

  // Textarea 自動高度
  const textarea = document.getElementById('chat-input');
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 110) + 'px';
  });

  // Enter 送出，Shift+Enter 換行
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // 貼上圖片直接傳給 Anchor
  textarea.addEventListener('paste', e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) sendImage(file, textarea.value.trim() || '');
        textarea.value = '';
        textarea.style.height = 'auto';
        return;
      }
    }
  });
});
