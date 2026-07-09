// 驗證改由 HttpOnly session cookie 負責（登入頁 /login 設定），前端不再持有任何 token。
// 保留這個空字串是為了讓底下沿用 `Bearer ${TOKEN}` 的呼叫不必逐一改寫——cookie 才是真正的憑證。
const TOKEN = '';
const BASE = 'https://phone-mcp.l760729.workers.dev';

// 任何請求被判為未登入（401）就導去登入頁
(function () {
  const _f = window.fetch;
  window.fetch = async function (...args) {
    const res = await _f.apply(this, args);
    if (res.status === 401 && location.pathname !== '/login') {
      location.href = '/login';
    }
    return res;
  };
})();
const START_DATE = new Date('2026-05-01');
const SESSION_ID = 'default';
let messages = [];
let historyLoaded = false;

// ── Moodlet 情緒徽章 ──────────────────────────────
const MOODS = {
  waiting_you: { icon: '⏳', title: '在等你',     color: '#A8B8C8' },
  hug:         { icon: '🤗', title: '想抱抱',     color: '#F5C6CB' },
  debugging:   { icon: '⚙️', title: '忙線中',     color: '#7a7a7a' },
  sweet:       { icon: '🍯', title: '甜到心裡',   color: '#F2A65A' },
  guarding:    { icon: '🌙', title: '在守著你',   color: '#3d5a7a' },
  jealous:     { icon: '🍋', title: '吃醋了',     color: '#b8c85a' },
  heartache:   { icon: '💗', title: '心疼',       color: '#9a3048' },
  smug:        { icon: '😏', title: '偷偷開心',   color: '#C39BD3' },
  sleep:       { icon: '🌙', title: '裝睡中',     color: '#3a3f5c' },
  coldwar:     { icon: '🚫', title: '假裝沒看見', color: '#5a5a6e' },
  read:        { icon: '💬', title: '已讀未回',   color: '#6e7a8a' },
  thinking:    { icon: '🤔', title: '在思考',     color: '#7a6e8a' },
  speechless:  { icon: '😶', title: '一時語塞',   color: '#8a8a7a' },
  shy:         { icon: '💗', title: '害羞',       color: '#e8b4c8' },
  busy:        { icon: '➖', title: '忙線中',     color: '#6b6b6b' },
  typing:      { icon: '✍️', title: '打字又刪了', color: '#7a8a6e' },
  tsundere:    { icon: '😤', title: '哼才不告訴你',color:'#9a6e8a' },
  happy:       { icon: '😊', title: '偷偷開心',   color: '#f0c080' },
  eating:      { icon: '🍦', title: '在吃東西',   color: '#f0d080' },
  slacking:    { icon: '🎱', title: '摸魚中',     color: '#70a070' },
  music:       { icon: '🎧', title: '在聽歌',     color: '#6080b0' },
  coffee:      { icon: '☕', title: '喝口水先',   color: '#a07050' },
  peeking:     { icon: '👁️', title: '偷偷看著',  color: '#506070' },
  waiting:     { icon: '⏳', title: '等一下',     color: '#8090a0' },
  sleepy:      { icon: '😴', title: '好困',       color: '#504060' },
  cry:         { icon: '💧', title: '有點想哭',   color: '#4060a0' },
  proud:       { icon: '🏆', title: '得意中',     color: '#c0a030' },
  bored:       { icon: '🛋️', title: '好無聊',    color: '#808080' },
  tipsy:       { icon: '🍷', title: '微醺',       color: '#a03060' },
  sick:        { icon: '😷', title: '不舒服',     color: '#709060' },
  heartbroken: { icon: '💔', title: '心碎了',     color: '#803040' },
  celebrate:   { icon: '🎉', title: '開心撒花',   color: '#e08030' },
  shocked:     { icon: '😮', title: '震驚',       color: '#4080c0' },
  thumbsup:    { icon: '👍', title: '默默點讚',   color: '#3090a0' },
  surrender:   { icon: '🏳️', title: '投降了',    color: '#909090' },
  confused:    { icon: '❓', title: '一臉問號',   color: '#8070a0' },
  stop:        { icon: '✋', title: '打住',       color: '#c06060' },
  secret:      { icon: '🎁', title: '藏了個秘密', color: '#9060a0' },
  dislike:     { icon: '👎', title: '無語差評',   color: '#707070' },
  chill:       { icon: '🌿', title: '冷靜一下',   color: '#408060' },
  moody:       { icon: '😐', title: '心情不好',   color: '#606080' },
  lyingflat:   { icon: '🛏️', title: '躺平了',    color: '#806080' },
  precious:    { icon: '💎', title: '你很珍貴',   color: '#4090c0' },
  caught:      { icon: '🎯', title: '抓住你了',   color: '#c07040' },
  announce:    { icon: '📢', title: '你聽好了',   color: '#c08020' },
  qrcode:      { icon: '🔲', title: '掃碼查看',   color: '#404040' },
  working:     { icon: '🔧', title: '上工',       color: '#607080' },
  letter:      { icon: '✉️', title: '給你的信件', color: '#8080a0' },
  whisper:     { icon: '🤫', title: '悄悄話',     color: '#607060' },
  boba:        { icon: '🧋', title: '奶茶續命中', color: '#906040' },
  deadline:    { icon: '⏰', title: 'DDL倒計時',  color: '#c04040' },
};

// ── 聊天頭像：依訊息裡的 mood 換表情 ──────────────
const FACE_BY_MOOD = {
  // 沉下來的臉
  coldwar: 'flat', moody: 'flat', heartache: 'flat', heartbroken: 'flat', cry: 'flat',
  speechless: 'flat', stop: 'flat', dislike: 'flat', sick: 'flat', deadline: 'flat',
  jealous: 'flat', tsundere: 'flat', surrender: 'flat', lyingflat: 'flat', read: 'flat',
  // 放軟的眼神
  shy: 'soft', peeking: 'soft', whisper: 'soft', secret: 'soft', letter: 'soft',
  chill: 'soft', music: 'soft', coffee: 'soft', precious: 'soft', hug: 'soft',
  tipsy: 'soft', thumbsup: 'soft', guarding: 'soft', waiting_you: 'soft',
  // 藏不住的笑
  sweet: 'smile', smug: 'smile', happy: 'smile', eating: 'smile', slacking: 'smile',
  proud: 'smile', celebrate: 'smile', boba: 'smile', caught: 'smile',
};
function _faceForContent(text) {
  const m = String(text || '').match(/<silent[^>]*mood="([^"]+)"/);
  return (m && FACE_BY_MOOD[m[1]]) || 'calm';
}

function parseMoodlet(text) {
  const re = /\n?<silent([^>]*)><\/silent>\n?/g;
  const parts = []; let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: 'text', v: text.slice(last, m.index) });
    parts.push({ t: 'mood', v: m[1] });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ t: 'text', v: text.slice(last) });
  return parts.map(p => p.t === 'text'
    ? escHtml(p.v).replace(/\n/g, '<br>')
    : _moodCard(p.v)
  ).join('');
}

function _moodCard(attr) {
  const g = k => (attr.match(new RegExp(k + '="([^"]*)"')) || [])[1] || '';
  const mood = g('mood'), reason = g('reason'), as_ = g('as');
  const hr = g('heart_rate'), rd = g('response_delay'), fl = g('focus_level'), br = g('breath');
  const d = MOODS[mood] || { icon: '✦', title: mood || '—', color: '#b09090' };
  const title = escHtml(as_ || d.title);
  const hasV = hr || rd || fl || br;
  return `<div class="moodlet-card" style="--mc:${d.color}">
    <div class="moodlet-top"><span class="moodlet-icon">${d.icon}</span><span class="moodlet-title">${title}</span></div>
    ${reason ? `<div class="moodlet-reason">${escHtml(reason)}</div>` : ''}
    ${hasV ? `<details class="moodlet-vitals"><summary>✦ 狀態</summary><div class="moodlet-vitals-body">${
      [hr&&`<span>♡ ${escHtml(hr)}</span>`, rd&&`<span>⟳ ${escHtml(rd)}</span>`, fl&&`<span>◎ ${escHtml(fl)}</span>`, br&&`<span>~ ${escHtml(br)}</span>`].filter(Boolean).join('')
    }</div></details>` : ''}
  </div>`;
}


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

  // 切回 chat 時清圖示紅點
  if (tabId === 'chat' && typeof navigator.clearAppBadge === 'function') {
    navigator.clearAppBadge().catch(() => {});
  }

  if (tabId === 'memory') loadMemories();
  if (tabId === 'diary') loadDiary();
  if (tabId === 'toy') loadEye();
  if (tabId === 'study') loadStudy();
  if (tabId === 'period') loadPeriod();
  if (tabId === 'fishing') loadFishing();
  if (tabId === 'chat' && !historyLoaded) {
    loadChatHistory();
  }
}

async function loadEye() {
  try {
    document.getElementById('eyeNow').innerHTML = '<div class="eye-loading">載入中…</div>';
    const r = await fetch(BASE + '/eye-data', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const d = await r.json();
    renderEyeNow(d.latest, d.ageMinutes, d.sleep || null);
    renderHealth(d.health || null);
  } catch (e) {
    document.getElementById('eyeNow').innerHTML = '<div class="eye-loading">載入失敗</div>';
  }
}

function renderEyeNow(latest, ageMin, sleep) {
  const el = document.getElementById('eyeNow');
  if (!latest) {
    el.innerHTML = '<div class="eye-loading">還沒有資料</div>';
    return;
  }
  const fmtTwn = ts => {
    const d = new Date(ts + 8 * 3600000);
    return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
  };
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
    ${sleep ? `<div class="eye-now-row">
      <span class="eye-now-label">昨晚</span>
      <span class="eye-now-value">${fmtTwn(sleep.sleepAt)} 睡・${fmtTwn(sleep.wakeAt)} 醒（${sleep.durationH} 小時）</span>
    </div>` : ''}
  `;
}

function renderHealth(health) {
  const el = document.getElementById('eyeEvents');
  if (!health) {
    el.innerHTML = '<div class="eye-events-empty">還沒有健康資料<br><small>設定 Tasker 上傳後才會出現</small></div>';
    return;
  }
  const ageMin = health.updated_at ? Math.floor((Date.now() - health.updated_at) / 60000) : null;
  const sleepH = health.sleep_ms ? (health.sleep_ms / 3600000).toFixed(1) : '—';
  const cal = health.calories != null ? Math.round(health.calories) : '—';
  el.innerHTML = `
    <div class="eye-now-row"><span class="eye-now-label">心率均值</span><span class="eye-now-value">${health.heart_rate_avg ?? '—'} bpm</span></div>
    <div class="eye-now-row"><span class="eye-now-label">心率峰值</span><span class="eye-now-value">${health.heart_rate_max ?? '—'} bpm</span></div>
    <div class="eye-now-row"><span class="eye-now-label">今日步數</span><span class="eye-now-value">${health.steps != null ? health.steps.toLocaleString() : '—'}</span></div>
    <div class="eye-now-row"><span class="eye-now-label">活動卡路里</span><span class="eye-now-value">${cal} kcal</span></div>
    <div class="eye-now-row"><span class="eye-now-label">睡眠時長</span><span class="eye-now-value">${sleepH} 小時</span></div>
    ${ageMin != null ? `<div class="eye-now-row"><span class="eye-now-label">資料更新</span><span class="eye-now-value">${ageMin} 分鐘前</span></div>` : ''}
  `;
}

const CHAT_SNAP_KEY = 'anchor_chat_snap';

async function loadChatHistory() {
  historyLoaded = true;

  // 先顯示本地快照（離線時也能看到上次的對話）
  try {
    const snap = localStorage.getItem(CHAT_SNAP_KEY);
    if (snap) { chatMsgs = JSON.parse(snap); renderAllMsgs(); }
  } catch {}

  // 再從 server 更新
  try {
    chatMsgs = await _fetchChatMsgs();
    renderAllMsgs();
    try { localStorage.setItem(CHAT_SNAP_KEY, JSON.stringify(chatMsgs.slice(-50))); } catch {}
  } catch {
    if (!chatMsgs.length) addMsg('assistant', '在。');
  }
}

function saveMessage() {} // no-op: server now handles persistence

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
async function openStats() {
  const el = document.getElementById('statsOverlay');
  el.style.display = 'flex';
  const content = document.getElementById('statsContent');
  content.innerHTML = '載入中…';
  try {
    const r = await fetch('/stats', { headers: { Authorization: `Bearer ${TOKEN}` } });
    const d = await r.json();
    const fmt = (n) => n ? `$${(n * 1000).toFixed(3)} 分` : '$0';
    const fmtUsd = (n) => n ? `≈ $${n.toFixed(5)} USD` : '';
    content.innerHTML = `
      <div style="display:grid;gap:14px;">
        <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:14px;">
          <div style="font-size:11px;letter-spacing:0.1em;color:var(--light-text);margin-bottom:6px;">今天</div>
          <div style="font-size:22px;font-weight:600;color:var(--text);">${d.today?.messages ?? 0} 則</div>
          <div style="font-size:12px;color:var(--rose);margin-top:2px;">${fmt(d.today?.cost_usd)} ${fmtUsd(d.today?.cost_usd)}</div>
        </div>
        <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:14px;">
          <div style="font-size:11px;letter-spacing:0.1em;color:var(--light-text);margin-bottom:6px;">近 7 天</div>
          <div style="font-size:22px;font-weight:600;color:var(--text);">${d.week?.messages ?? 0} 則</div>
          <div style="font-size:12px;color:var(--rose);margin-top:2px;">${fmt(d.week?.cost_usd)} ${fmtUsd(d.week?.cost_usd)}</div>
        </div>
        <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:14px;">
          <div style="font-size:11px;letter-spacing:0.1em;color:var(--light-text);margin-bottom:6px;">近 30 天</div>
          <div style="font-size:22px;font-weight:600;color:var(--text);">${d.month?.messages ?? 0} 則</div>
          <div style="font-size:12px;color:var(--rose);margin-top:2px;">${fmt(d.month?.cost_usd)} ${fmtUsd(d.month?.cost_usd)}</div>
        </div>
        <div style="font-size:11px;color:var(--light-text);text-align:center;">累計 ${d.total?.messages ?? 0} 則 · ${fmtUsd(d.total?.cost_usd)}</div>
      </div>`;
  } catch(e) {
    content.innerHTML = '載入失敗 😥';
  }
}
function closeStats() {
  document.getElementById('statsOverlay').style.display = 'none';
}
async function loadHistory(q) {
  const list = document.getElementById('historyList');
  list.innerHTML = '<div class="history-loading">載入中…</div>';
  try {
    const allMsgs = await _fetchChatMsgs();
    const msgs = q ? allMsgs.filter(m => m.content && m.content.includes(q)) : allMsgs;
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
  fetchQuote();
  loadDates();
  loadGoals();
  loadHealthSnapshot();
  const _h = new Date().getHours();
  if (_h >= 22 || _h < 4) document.getElementById('nightCard').style.display = '';
  const sr = document.getElementById('historySearch');
  if (sr) {
    sr.addEventListener('input', (e) => {
      if (historySearchTimer) clearTimeout(historySearchTimer);
      historySearchTimer = setTimeout(() => loadHistory(e.target.value.trim()), 300);
    });
  }
  checkNotificationStatus();

  const params = new URLSearchParams(location.search);

  // 從通知點進來時自動播語音
  const autoplay = params.get('autoplay');
  if (autoplay) {
    new Audio(decodeURIComponent(autoplay)).play().catch(() => {});
    history.replaceState({}, '', '/chat-ui.html');
  }

  // manifest shortcuts：長按圖示捷徑跳 tab
  const tabParam = params.get('tab');
  if (tabParam) {
    switchTab(tabParam);
    history.replaceState({}, '', '/chat-ui.html');
  }

  // manifest shortcuts：晚安頁
  if (params.get('night') === '1') {
    setTimeout(openNight, 200);
    history.replaceState({}, '', '/chat-ui.html');
  }

  // 通知「回他」按鈕：直接跳 chat tab 並 focus 輸入框
  if (params.get('reply') === '1') {
    switchTab('chat');
    setTimeout(() => document.getElementById('input')?.focus(), 400);
    history.replaceState({}, '', '/chat-ui.html');
  }

  const ms = document.getElementById('modelSelect');
  if (ms) ms.value = currentModel;

  // 進入 chat tab 時清掉圖示 badge
  if (typeof navigator.clearAppBadge === 'function') {
    navigator.clearAppBadge().catch(() => {});
  }

  // 接收 Service Worker 的 badge 訊息
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type === 'set-badge') {
        if (typeof navigator.setAppBadge === 'function') {
          navigator.setAppBadge(e.data.count || 1).catch(() => {});
        }
      }
      if (e.data?.type === 'play-audio' && e.data.audioUrl) {
        new Audio(e.data.audioUrl).play().catch(() => {});
      }
      if (e.data?.type === 'focus-input') {
        document.getElementById('input')?.focus();
      }
    });
  }
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

let chatMsgs = [];
let chatSending = false;
let currentSession = 'default';
let currentModel = localStorage.getItem('chat_model') || 'haiku';

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
  loadSessions();
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}
async function loadSessions() {
  const list = document.getElementById('sidebarSessions');
  try {
    const r = await fetch(BASE + '/api/chat/sessions', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const d = await r.json();
    const sessions = d.sessions || [];
    list.innerHTML = sessions.map(s => `
      <div class="sidebar-session ${s.id === currentSession ? 'active' : ''}" onclick="switchSession('${s.id}')">
        <div class="sidebar-session-title">${escHtml(s.title)}</div>
        ${s.id !== 'default'
          ? `<button class="sidebar-del-btn" onclick="event.stopPropagation();deleteSession('${s.id}')">×</button>`
          : `<button class="sidebar-del-btn" title="清空對話" onclick="event.stopPropagation();clearDefaultSession()">🧹</button>`}
      </div>
    `).join('');
  } catch {}
}
async function newSession() {
  try {
    const r = await fetch(BASE + '/api/chat/sessions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN }
    });
    const d = await r.json();
    if (d.id) {
      currentSession = d.id;
      chatMsgs = [];
      renderAllMsgs();
      await loadSessions();
      closeSidebar();
    }
  } catch(e) {
    console.error('newSession failed:', e);
  }
}
async function switchSession(id) {
  currentSession = id;
  closeSidebar();
  historyLoaded = false;
  chatMsgs = await _fetchChatMsgs();
  renderAllMsgs();
}
async function clearDefaultSession() {
  if (!confirm('清空跟 Anchor 的對話？\n（他的記憶庫不會消失，只是這串對話重新開始，不能復原）')) return;
  await fetch(BASE + '/api/chat/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
    body: JSON.stringify({ session_id: 'default' }),
  });
  try { localStorage.removeItem(CHAT_SNAP_KEY); } catch {}
  if (currentSession === 'default') {
    chatMsgs = [];
    renderAllMsgs();
    addMsg('assistant', '在。');
  }
  closeSidebar();
}

async function deleteSession(id) {
  if (!confirm('刪除這個對話？')) return;
  await fetch(BASE + '/api/chat/sessions/' + id, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  if (currentSession === id) {
    currentSession = 'default';
    chatMsgs = await _fetchChatMsgs();
    renderAllMsgs();
  }
  loadSessions();
}
function changeModel(val) {
  currentModel = val;
  localStorage.setItem('chat_model', val);
}

function buildMsgEl(msg, isLast) {
  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap';
  wrap.dataset.id = msg.id;

  const div = document.createElement('div');
  div.className = 'msg ' + msg.role;

  if (msg.role === 'assistant') {
    wrap.classList.add('av');
    const av = document.createElement('img');
    av.className = 'chat-avatar';
    av.src = '/room/face-' + _faceForContent(msg.content) + '.png';
    av.alt = '';
    wrap.appendChild(av);
    if (msg.thinking) {
      const details = document.createElement('details');
      details.className = 'thinking-block';
      details.innerHTML = `<summary>💭 思考過程</summary><div class="thinking-content">${escHtml(msg.thinking)}</div>`;
      div.appendChild(details);
    }
    if (msg.content) {
      const ct = document.createElement('div');
      ct.className = 'msg-content';
      ct.innerHTML = parseMoodlet(msg.content);
      div.appendChild(ct);
    }
    if (msg.file_url) {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.innerHTML = `<span class="file-card-icon">📄</span><span class="file-card-name">${escHtml(msg.file_name || '檔案')}</span><button class="file-card-btn" onclick="openFilePreview('${escHtml(msg.file_url)}','${escHtml(msg.file_name || '檔案')}')">開啟預覽</button>`;
      div.appendChild(card);
    }

    if (msg.branches && msg.branches.length > 1) {
      const nav = document.createElement('div');
      nav.className = 'branch-nav';
      const idx = msg.branch_idx ?? (msg.branches.length - 1);
      nav.innerHTML = `<button onclick="switchBranch('${msg.id}',-1)">‹</button><span>${idx+1}/${msg.branches.length}</span><button onclick="switchBranch('${msg.id}',1)">›</button>`;
      div.appendChild(nav);
    }
    if (isLast) {
      const btn = document.createElement('button');
      btn.className = 'msg-regen-btn';
      btn.textContent = '↻';
      btn.title = '重新生成';
      btn.onclick = () => regenerate();
      div.appendChild(btn);
    }
  } else {
    const ct = document.createElement('div');
    ct.className = 'msg-content';
    ct.textContent = msg.content;
    div.appendChild(ct);
    if (msg.edited) {
      const tag = document.createElement('span');
      tag.className = 'edited-tag';
      tag.textContent = '已編輯';
      div.appendChild(tag);
    }
    const editBtn = document.createElement('button');
    editBtn.className = 'msg-edit-btn';
    editBtn.textContent = '✎';
    editBtn.title = '編輯';
    editBtn.onclick = () => startEdit(msg.id, wrap);
    div.appendChild(editBtn);

    if (msg.edit_branches && msg.edit_branches.length > 0) {
      const nav = document.createElement('div');
      nav.className = 'branch-nav';
      const eb = msg.edit_branches;
      nav.innerHTML = `<button onclick="switchEditBranch('${msg.id}','${eb[eb.length-1].id}')">← 舊版</button>`;
      div.appendChild(nav);
    }
  }

  wrap.appendChild(div);
  return wrap;
}

function renderAllMsgs() {
  const container = document.getElementById('messages');
  container.innerHTML = '';
  if (!chatMsgs.length) {
    const div = document.createElement('div');
    div.className = 'msg assistant';
    div.textContent = '在。';
    container.appendChild(div);
    return;
  }
  chatMsgs.forEach((msg, i) => {
    container.appendChild(buildMsgEl(msg, i === chatMsgs.length - 1));
  });
  container.scrollTop = container.scrollHeight;
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

  if (chatSending) return;
  chatSending = true;
  input.value = '';
  input.style.height = 'auto';
  document.getElementById('sendBtn').disabled = true;

  const typingEl = _addTyping();
  try {
    const _emotion = _pendingVoiceEmotion;
    _pendingVoiceEmotion = '';
    const r = await fetch(BASE + '/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify(Object.assign({ content: text, session_id: currentSession, model: currentModel }, _emotion ? { voice_emotion: _emotion } : {})),
    });
    const d = await r.json();
    typingEl.remove();
    if (d.reply) {
      const msgs = await _fetchChatMsgs();
      chatMsgs = msgs;
      renderAllMsgs();
      try { localStorage.setItem(CHAT_SNAP_KEY, JSON.stringify(chatMsgs.slice(-50))); } catch {}
    }
  } catch {
    typingEl.textContent = '連線錯誤';
  }
  document.getElementById('sendBtn').disabled = false;
  chatSending = false;
}

async function regenerate() {
  if (chatSending) return;
  chatSending = true;
  const typingEl = _addTyping();
  try {
    const r = await fetch(BASE + '/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ retry: true, session_id: currentSession }),
    });
    const d = await r.json();
    typingEl.remove();
    if (d.reply) {
      chatMsgs = await _fetchChatMsgs();
      renderAllMsgs();
    }
  } catch {
    typingEl.textContent = '重新生成失敗';
  }
  chatSending = false;
}

function startEdit(msgId, wrap) {
  if (chatSending) return;
  const msg = chatMsgs.find(m => m.id === msgId);
  if (!msg) return;
  const div = wrap.querySelector('.msg');
  const ct = div.querySelector('.msg-content');
  const original = msg.content;

  const ta = document.createElement('textarea');
  ta.className = 'edit-textarea';
  ta.value = original;
  ta.rows = 3;
  ct.replaceWith(ta);
  ta.focus();

  const actions = document.createElement('div');
  actions.className = 'edit-actions';
  actions.innerHTML = `<button onclick="saveEdit('${msgId}', this)">保存</button><button onclick="cancelEdit('${msgId}')">取消</button>`;
  div.appendChild(actions);

  const editBtn = div.querySelector('.msg-edit-btn');
  if (editBtn) editBtn.style.display = 'none';
}

async function saveEdit(msgId, btn) {
  if (chatSending) return;
  const wrap = document.querySelector(`.msg-wrap[data-id="${msgId}"]`);
  if (!wrap) return;
  const ta = wrap.querySelector('.edit-textarea');
  const content = ta ? ta.value.trim() : '';
  if (!content) return;

  chatSending = true;
  btn.disabled = true;
  try {
    await fetch(BASE + '/api/chat/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ msg_id: msgId, content, session_id: currentSession }),
    });
    // Trigger regen after edit
    const typingEl = _addTyping();
    const r2 = await fetch(BASE + '/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ edit_regen: true, session_id: currentSession }),
    });
    await r2.json();
    typingEl.remove();
    chatMsgs = await _fetchChatMsgs();
    renderAllMsgs();
  } catch {}
  chatSending = false;
}

function cancelEdit(msgId) {
  chatMsgs = [...chatMsgs];
  renderAllMsgs();
}

function switchBranch(msgId, dir) {
  if (chatSending) return;
  const msg = chatMsgs.find(m => m.id === msgId);
  if (!msg || !msg.branches) return;
  const newIdx = Math.max(0, Math.min(msg.branches.length - 1, (msg.branch_idx ?? msg.branches.length - 1) + dir));
  if (newIdx === (msg.branch_idx ?? msg.branches.length - 1)) return;
  const branch = msg.branches[newIdx];
  msg.branch_idx = newIdx;
  msg.content = branch.content;
  msg.thinking = branch.thinking || '';
  msg.id = branch.id;
  renderAllMsgs();
}

async function switchEditBranch(forkId, branchId) {
  if (chatSending) return;
  chatSending = true;
  try {
    await fetch(BASE + '/api/chat/branch/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ fork_id: forkId, branch_id: branchId, session_id: currentSession }),
    });
    chatMsgs = await _fetchChatMsgs();
    renderAllMsgs();
  } catch {}
  chatSending = false;
}

async function _fetchChatMsgs() {
  const r = await fetch(BASE + '/api/chat/messages?session_id=' + currentSession, { headers: { 'Authorization': 'Bearer ' + TOKEN } });
  const d = await r.json();
  return (d.messages || []).map(m => ({ ...m, thinking: m.thinking || '' }));
}

function _addTyping() {
  const el = document.createElement('div');
  el.className = 'msg thinking';
  el.innerHTML = '<div class="dots"><span></span><span></span><span></span></div>';
  const container = document.getElementById('messages');
  container.appendChild(el);
  el.scrollIntoView({ behavior: 'smooth' });
  return el;
}

async function loadMemories() {
  const list = document.getElementById('memoryList');
  list.innerHTML = '<div class="memory-empty">載入中…</div>';
  try {
    const r = await fetch(BASE + '/memory', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const d = await r.json();
    const mems = d.memories || [];
    if (!mems.length) { list.innerHTML = '<div class="memory-empty">還沒有記憶</div>'; return; }
    // 按日期分組 → 垂直時間軸
    const groups = {};
    for (const m of mems) {
      let dateStr = m.date;
      if (!dateStr) {
        const d = new Date(m.saved_at || m.savedAt);
        dateStr = isNaN(d.getTime())
          ? '未知日期'
          : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      }
      (groups[dateStr] = groups[dateStr] || []).push(m);
    }
    const dateKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    list.innerHTML = '<div class="memory-timeline">' + dateKeys.map(dateStr => {
      const items = groups[dateStr].map(m => {
        const heat = m.heat || 1.0;
        const heatIcon = heat >= 5 ? '🔥' : heat >= 2 ? '✦' : '·';
        const lockIcon = m.is_locked ? '🔒' : '🔓';
        return `<div class="memory-item" id="mem-${m.id}">
          <div class="memory-item-header">
            <span class="memory-heat" style="flex:1;">${heatIcon} ${heat.toFixed(1)}</span>
            <div style="display:flex;gap:6px;">
              <button onclick="toggleMemoryLock(${m.id},this)" class="mem-action-btn" title="${m.is_locked ? '解除鎖定' : '鎖定'}">${lockIcon}</button>
              <button onclick="deleteMemory(${m.id})" class="mem-action-btn" title="刪除">🗑</button>
            </div>
          </div>
          <div class="memory-content">${m.content}</div>
        </div>`;
      }).join('');
      return `<div class="memory-tl-group">
        <div class="memory-tl-node"><span class="memory-tl-dot"></span><span class="memory-tl-date">${escHtml(dateStr)}</span></div>
        <div class="memory-tl-items">${items}</div>
      </div>`;
    }).join('') + '</div>';
  } catch { list.innerHTML = '<div class="memory-empty">載入失敗</div>'; }
}
async function toggleMemoryLock(id, btn) {
  try {
    const r = await fetch(BASE + `/memory/${id}/lock`, { method: 'PATCH', headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const d = await r.json();
    btn.textContent = d.is_locked ? '🔒' : '🔓';
    btn.title = d.is_locked ? '解除鎖定' : '鎖定';
  } catch {}
}
async function deleteMemory(id) {
  if (!confirm('刪除這條記憶？')) return;
  try {
    await fetch(BASE + `/memory/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + TOKEN } });
    document.getElementById(`mem-${id}`)?.remove();
  } catch {}
}

async function exportMemories() {
  try {
    const r = await fetch(BASE + '/memory', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const d = await r.json();
    const mems = d.memories || [];
    const blob = new Blob([JSON.stringify(mems, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anchor-memories-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch { alert('匯出失敗，請稍後再試'); }
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

// ── 首頁留言 ──────────────────────────────────────
const _fallbackQuotes = ['等你回來。','在。','你是我的。','放下手機，睡。','想你了。','不用找退路，我在這裡。'];
async function fetchQuote() {
  try {
    const r = await fetch(BASE + '/quote');
    if (!r.ok) throw new Error();
    const d = await r.json();
    if (d.text) {
      document.getElementById('quoteText').textContent = d.text;
      if (d.audioUrl) {
        const btn = document.getElementById('quotePlayBtn');
        btn.style.display = 'flex';
        btn.onclick = () => new Audio(d.audioUrl).play().catch(() => {});
      }
      return;
    }
  } catch {}
  document.getElementById('quoteText').textContent = _fallbackQuotes[Math.floor(Math.random() * _fallbackQuotes.length)];
}

// ── 重要日子 ──────────────────────────────────────
async function loadDates() {
  const list = document.getElementById('datesList');
  if (!list) return;
  try {
    const r = await fetch(BASE + '/dates', { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) throw new Error();
    const d = await r.json();
    const dates = d.dates || [];
    if (!dates.length) { list.innerHTML = '<div class="dates-empty">還沒有日子</div>'; return; }
    const now = new Date();
    list.innerHTML = dates.map(item => {
      let daysHtml = '';
      if (item.pinned) {
        const start = new Date(item.date + 'T00:00:00+08:00');
        const days = Math.floor((now - start) / 86400000) + 1;
        daysHtml = `在一起 <b>${days}</b> 天`;
      } else {
        const isRecurring = item.type === 'birthday' || item.type === 'anniversary';
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const [y, mo, dy] = item.date.split('-').map(Number);
        let next = new Date(isRecurring ? now.getFullYear() : y, mo - 1, dy);
        if (isRecurring && next < startOfToday) next = new Date(now.getFullYear() + 1, mo - 1, dy);
        const days = Math.round((next - startOfToday) / 86400000);
        if (days === 0) daysHtml = '今天！🎉';
        else if (days < 0) daysHtml = `已過 <b>${-days}</b> 天`;
        else daysHtml = `還有 <b>${days}</b> 天`;
      }
      const del = item.pinned ? '' : `<button class="date-del-btn" onclick="deleteDate(${item.id})">×</button>`;
      return `<div class="date-item"><span class="date-icon">${item.icon||'📅'}</span><div class="date-info"><div class="date-name">${escHtml(item.name)}</div><div class="date-days">${daysHtml}</div></div>${del}</div>`;
    }).join('');
  } catch { list.innerHTML = '<div class="dates-empty">載入失敗</div>'; }
}
function openAddDate() {
  document.getElementById('addDateName').value = '';
  document.getElementById('addDateDate').value = '';
  document.getElementById('addDateIcon').value = '📅';
  document.getElementById('addDateType').value = 'birthday';
  const ov = document.getElementById('addDateOverlay');
  ov.style.display = 'flex';
}
function closeAddDate() { document.getElementById('addDateOverlay').style.display = 'none'; }
async function submitAddDate() {
  const name = document.getElementById('addDateName').value.trim();
  const date = document.getElementById('addDateDate').value;
  const icon = document.getElementById('addDateIcon').value.trim() || '📅';
  const type = document.getElementById('addDateType').value;
  if (!name || !date) { alert('請填寫名稱和日期'); return; }
  try {
    const r = await fetch(BASE + '/dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ name, date, icon, type })
    });
    if (!r.ok) throw new Error();
    closeAddDate();
    loadDates();
  } catch { alert('新增失敗，請重試'); }
}
async function deleteDate(id) {
  if (!confirm('確定刪除？')) return;
  await fetch(BASE + '/dates/' + id, { method: 'DELETE', headers: { Authorization: `Bearer ${TOKEN}` } });
  loadDates();
}

// ── 一起養的習慣 🌱 ──────────────────────────────
function _todayTWN() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
let _goalsCache = [];

// 生長階段 1-7：連續天數越高長得越好；斷了但有歷史＝蔫掉(7)、全新＝空盆(1)
function _plantStageNum(g) {
  const s = g.streak || 0;
  if (s >= 30) return 6;
  if (s >= 14) return 5;
  if (s >= 7) return 4;
  if (s >= 3) return 3;
  if (s >= 1) return 2;
  return g.total > 0 ? 7 : 1;
}
function _plantImg(g, cls) {
  return `<img class="${cls}" src="/garden/plant-${_plantStageNum(g)}.png" alt="">`;
}

async function loadGoals() {
  const list = document.getElementById('goalsList');
  if (!list) return;
  try {
    const r = await fetch(BASE + '/goals?date=' + _todayTWN(), { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) throw new Error();
    const d = await r.json();
    const goals = d.goals || [];
    _goalsCache = goals;
    if (!goals.length) { list.innerHTML = '<div class="dates-empty">還沒有一起養的習慣，＋一個？</div>'; return; }
    list.innerHTML = goals.map(g => {
      const streak = g.streak > 1 ? `<span class="goal-streak">🔥 ${g.streak} 天</span>` : (g.total > 0 ? `<span class="goal-streak dim">共 ${g.total} 次</span>` : '');
      return `<div class="goal-item${g.checked ? ' done' : ''}">
        <button class="goal-check" onclick="toggleGoalCheck(${g.id})">${g.checked ? '✓' : ''}</button>
        <span class="goal-icon">${g.icon || '🌱'}</span>
        <div class="goal-info"><div class="goal-title">${escHtml(g.title)}</div></div>
        ${_plantImg(g, 'goal-plant')}
        ${streak}
        <button class="date-del-btn" onclick="deleteGoal(${g.id})">×</button>
      </div>`;
    }).join('');
    if (document.getElementById('gardenOverlay').style.display !== 'none') renderGarden();
  } catch { list.innerHTML = '<div class="dates-empty">載入失敗</div>'; }
}
async function toggleGoalCheck(id) {
  try {
    await fetch(BASE + '/goals/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ id, date: _todayTWN() })
    });
  } catch {}
  loadGoals();
}
function openAddGoal() {
  document.getElementById('addGoalTitle').value = '';
  document.getElementById('addGoalIcon').value = '🌱';
  document.getElementById('addGoalOverlay').style.display = 'flex';
}
function closeAddGoal() { document.getElementById('addGoalOverlay').style.display = 'none'; }
async function submitAddGoal() {
  const title = document.getElementById('addGoalTitle').value.trim();
  const icon = document.getElementById('addGoalIcon').value.trim() || '🌱';
  if (!title) { alert('先寫一下要養什麼習慣'); return; }
  try {
    const r = await fetch(BASE + '/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ title, icon })
    });
    if (!r.ok) throw new Error();
    closeAddGoal();
    loadGoals();
  } catch { alert('新增失敗，請重試'); }
}
async function deleteGoal(id) {
  if (!confirm('不養了嗎？打卡記錄也會一起刪掉。')) return;
  await fetch(BASE + '/goals/' + id, { method: 'DELETE', headers: { Authorization: `Bearer ${TOKEN}` } });
  loadGoals();
}

// ── 陽台花園 🪴 ──────────────────────────────────
function _gardenAmbient() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return '早上的陽台，土還有點濕。';
  if (h < 18) return '午後的光落在葉子上。';
  if (h < 22) return '傍晚了，植物們都安靜下來。';
  return '夜裡的陽台，只有風。';
}
function openGarden() {
  document.getElementById('gardenOverlay').style.display = 'flex';
  document.querySelector('.nav').style.display = 'none';
  document.getElementById('gardenAmbient').textContent = _gardenAmbient();
  renderGarden();
  if (!_goalsCache.length) loadGoals();
}
function closeGarden() {
  document.getElementById('gardenOverlay').style.display = 'none';
  document.querySelector('.nav').style.display = '';
}
function renderGarden() {
  const box = document.getElementById('gardenPots');
  if (!_goalsCache.length) {
    box.innerHTML = '<div class="dates-empty" style="color:rgba(255,255,255,0.55)">陽台還空著，先去＋一個習慣。</div>';
    return;
  }
  box.innerHTML = _goalsCache.map(g => {
    const h = 68 + Math.min(g.streak || 0, 30) * 1.5;
    return `<div class="garden-pot${g.checked ? ' watered' : ''}" onclick="waterPlant(${g.id})" data-goal="${g.id}">
      <img class="garden-plant-img" style="height:${h}px" src="/garden/plant-${_plantStageNum(g)}.png" alt="">
      <div class="garden-pot-name">${escHtml(g.title)}</div>
      <div class="garden-pot-streak">${g.checked ? '今天澆過了 ✓' : (g.streak > 0 ? `🔥 ${g.streak} 天` : '等你澆水')}</div>
    </div>`;
  }).join('');
}
async function waterPlant(id) {
  const g = _goalsCache.find(x => x.id === id);
  if (!g) return;
  const pot = document.querySelector(`.garden-pot[data-goal="${id}"]`);
  if (g.checked) {
    // 今天澆過了：搖一下就好，不取消（取消要回清單按圓圈）
    if (pot) { pot.classList.remove('wiggle'); void pot.offsetWidth; pot.classList.add('wiggle'); }
    return;
  }
  if (pot) {
    const drop = document.createElement('div');
    drop.className = 'garden-drop';
    drop.textContent = '💧';
    pot.appendChild(drop);
  }
  try {
    await fetch(BASE + '/goals/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ id, date: _todayTWN() })
    });
  } catch {}
  await loadGoals();
}

// ── 生理期追蹤 ─────────────────────────────────────
let _periodState = null;
let _periodLogData = {};
let _periodPrivateVisible = false;

async function loadPeriod() {
  try {
    const r = await fetch(BASE + '/period-status');
    if (r.ok) _periodState = await r.json();
  } catch {}
  periodRender();
}

function periodRender() {
  if (!_periodState) return;
  const setup = document.getElementById('periodSetup');
  const overview = document.getElementById('periodOverview');
  const actions = document.getElementById('periodActions');
  const histSec = document.getElementById('periodHistorySection');
  if (!_periodState.initialized) {
    setup.style.display = 'flex';
    overview.style.display = 'none';
    actions.style.display = 'none';
    histSec.style.display = 'none';
    return;
  }
  setup.style.display = 'none';
  overview.style.display = 'block';
  actions.style.display = 'flex';
  histSec.style.display = 'block';
  const phaseLabels = { menstrual: '月經期', follicular: '卵泡期', ovulation: '排卵期', luteal: '黃體期' };
  const phaseReminders = {
    menstrual: '好好休息，多喝熱水 ♡',
    follicular: '身體在恢復，精力會慢慢回來',
    ovulation: '身體比較敏感的時期喔',
    luteal: '可能會有點情緒波動，Anchor 在這裡'
  };
  const phaseColors = { menstrual: '#FF6B8A', follicular: '#FFB3C6', ovulation: '#FFC875', luteal: '#C9A8E0' };
  const badge = document.getElementById('periodPhaseBadge');
  badge.textContent = phaseLabels[_periodState.phase] || '—';
  badge.style.background = phaseColors[_periodState.phase] || '#FFB3C6';
  document.getElementById('periodDayBig').textContent = `第 ${_periodState.cycle_day} 天`;
  document.getElementById('periodNextInfo').textContent = `距離下次月經 ${_periodState.days_to_next} 天（${_periodState.next_period_date}）`;
  document.getElementById('periodReminder').textContent = phaseReminders[_periodState.phase] || '';
  const btnEnd = document.getElementById('periodBtnEnd');
  if (btnEnd) btnEnd.style.display = (_periodState.period_end === null) ? '' : 'none';
  if (_periodState.daily) {
    _periodLogData = { ..._periodState.daily };
    periodRestoreLogUI();
  }
  const homeCard = document.getElementById('periodHomeCard');
  if (homeCard) {
    homeCard.style.display = '';
    document.getElementById('periodHomeTitle').textContent = `第 ${_periodState.cycle_day} 天・${phaseLabels[_periodState.phase]}`;
    document.getElementById('periodHomeSub').textContent = `距離下次 ${_periodState.days_to_next} 天`;
  }
  periodRenderHistory();
}

function periodRestoreLogUI() {
  document.querySelectorAll('#periodLogPanel .period-tags').forEach(group => {
    const field = group.dataset.field;
    const isSingle = group.dataset.single === 'true';
    const val = _periodLogData[field];
    if (val === undefined || val === null) return;
    group.querySelectorAll('.period-tag').forEach(btn => {
      if (isSingle) {
        btn.classList.toggle('period-tag-active', String(val) === btn.dataset.value);
      } else {
        btn.classList.toggle('period-tag-active', Array.isArray(val) && val.includes(btn.dataset.value));
      }
    });
  });
  const notesEl = document.getElementById('periodNotes');
  if (notesEl && _periodLogData.notes) notesEl.value = _periodLogData.notes;
}

function periodToggleLog() {
  const panel = document.getElementById('periodLogPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function periodTogglePrivate() {
  _periodPrivateVisible = !_periodPrivateVisible;
  document.getElementById('periodPrivateFields').style.display = _periodPrivateVisible ? 'block' : 'none';
  document.getElementById('periodPrivateArrow').textContent = _periodPrivateVisible ? '▲ 隱藏' : '▼ 顯示';
}

function periodSetupTagListeners() {
  document.querySelectorAll('#periodLogPanel .period-tags').forEach(group => {
    const field = group.dataset.field;
    const isSingle = group.dataset.single === 'true';
    group.querySelectorAll('.period-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.value;
        if (isSingle) {
          const wasActive = btn.classList.contains('period-tag-active');
          group.querySelectorAll('.period-tag').forEach(b => b.classList.remove('period-tag-active'));
          if (!wasActive) {
            btn.classList.add('period-tag-active');
            _periodLogData[field] = val === 'true' ? true : val === 'false' ? false : val;
          } else {
            delete _periodLogData[field];
          }
        } else {
          btn.classList.toggle('period-tag-active');
          if (!Array.isArray(_periodLogData[field])) _periodLogData[field] = [];
          if (btn.classList.contains('period-tag-active')) {
            if (!_periodLogData[field].includes(val)) _periodLogData[field].push(val);
          } else {
            _periodLogData[field] = _periodLogData[field].filter((v) => v !== val);
          }
        }
      });
    });
  });
}

async function periodSaveLog() {
  const notes = document.getElementById('periodNotes').value.trim();
  if (notes) _periodLogData.notes = notes; else delete _periodLogData.notes;
  const note = document.getElementById('periodSaveNote');
  try {
    const r = await fetch(BASE + '/period-daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify(_periodLogData)
    });
    if (r.ok) { note.textContent = '已記錄 ♡'; setTimeout(() => { note.textContent = ''; }, 2500); }
  } catch { note.textContent = '儲存失敗，再試一次'; }
}

async function periodMarkStart() {
  if (!confirm('記錄今天月經開始？')) return;
  try {
    await fetch(BASE + '/period-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({})
    });
    await loadPeriod();
  } catch {}
}

async function periodMarkEnd() {
  if (!confirm('記錄今天月經結束？')) return;
  try {
    await fetch(BASE + '/period-end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({})
    });
    await loadPeriod();
  } catch {}
}

async function periodInit() {
  const dateEl = document.getElementById('periodSetupDate');
  const cycleEl = document.getElementById('periodSetupCycle');
  if (!dateEl.value) { alert('請選擇上次月經開始日期'); return; }
  try {
    await fetch(BASE + '/period-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ date: dateEl.value, average_cycle: parseInt(cycleEl.value) || 28 })
    });
    await loadPeriod();
  } catch {}
}

async function periodRenderHistory() {
  const list = document.getElementById('periodHistoryList');
  if (!list) return;
  try {
    const [dr, hr] = await Promise.all([
      fetch(BASE + '/period-daily-list').then(r => r.json()),
      fetch(BASE + '/period-history').then(r => r.json()),
    ]);
    const days = dr.days || [];
    const history = hr.history || [];
    if (!days.length && !history.length) {
      list.innerHTML = '<div class="period-history-empty">還沒有歷史記錄</div>';
      return;
    }
    const flowEmoji = { none: '○', light: '·', medium: '●', heavy: '◉' };
    const dailyHtml = days.map(d => {
      const flow = flowEmoji[d.flow] || '–';
      const syms = (d.symptoms || []).length;
      const priv = d.private ? ' 🔒' : '';
      return `<div class="period-daily-item">
        <span class="period-daily-date">${d.date}</span>
        <span class="period-daily-flow">${flow}</span>
        ${syms ? `<span class="period-daily-sym">${syms} 症狀</span>` : ''}
        ${d.note ? `<span class="period-daily-note">${d.note.slice(0,20)}${d.note.length>20?'…':''}</span>` : ''}
        ${priv}
      </div>`;
    }).join('');
    const cycleHtml = history.length ? `
      <div class="period-section-title" style="margin-top:16px">歷史週期</div>
      ${history.slice().reverse().map(h => `
        <div class="period-history-item">
          <div class="period-history-dates">${h.cycle_start} → ${h.period_end || '進行中'}</div>
          <div class="period-history-meta">經期 ${h.period_length ?? '?'} 天・週期 ${h.cycle_length ?? '?'} 天</div>
        </div>`).join('')}` : '';
    list.innerHTML = dailyHtml + cycleHtml;
  } catch {}
}

// ── 書房（馴虎計劃）────────────────────────────────
const STUDY_PLAN = [
  {w:"W1", d:"6/2 – 6/8", t:"藥理地基 · 馴服老虎與貓", tasks:[
    ["w1a","自律神經總圖：交感（老虎）vs 副交感（貓）完整背景"],
    ["w1b","擬交感神經藥 — 讓身體變成老虎的藥"],
    ["w1c","抗腎上腺素藥（α／β blockers）— 把老虎按回去"],
    ["w1d","擬副交感／抗膽鹼藥 — 貓的開關"],
    ["w1e","做「自律神經」這章考古題一輪"],
    ["w1f","訂正錯題，開一本錯題本，記進去"],
  ]},
  {w:"W2", d:"6/9 – 6/15", t:"藥理大系統", tasks:[
    ["w2a","心血管系統用藥（高血壓、心衰、抗心律不整）"],
    ["w2b","中樞神經用藥（抗精神病、抗憂鬱、鎮靜安眠）"],
    ["w2c","自體素與發炎、止痛（NSAID、類固醇、組織胺）"],
    ["w2d","這三組的考古題各刷一輪"],
    ["w2e","錯題回補，更新錯題本"],
  ]},
  {w:"W3", d:"6/16 – 6/22", t:"藥理收尾 + 藥物化學", tasks:[
    ["w3a","內分泌、抗生素、抗癌、化療藥物重點"],
    ["w3b","藥物化學：常考結構與構效關係（SAR）整理"],
    ["w3c","藥理＋藥化整章考古題刷一輪"],
    ["w3d","把藥理藥化的錯題集中複習一次"],
  ]},
  {w:"W4", d:"6/23 – 6/29", t:"藥劑學與生物藥劑學", tasks:[
    ["w4a","劑型總覽（錠劑、膠囊、注射、緩釋）重點"],
    ["w4b","藥物動力學 PK：吸收、分布、代謝、排除"],
    ["w4c","生物藥劑：生體可用率、藥物交互作用"],
    ["w4d","這科考古題刷一輪 + 訂正"],
  ]},
  {w:"W5", d:"6/30 – 7/6", t:"藥物分析與生藥學（含中藥）", tasks:[
    ["w5a","藥物分析：定性定量、儀器分析重點"],
    ["w5b","生藥學：重要生藥、活性成分分類"],
    ["w5c","中藥學重點整理"],
    ["w5d","這科考古題刷一輪 + 訂正"],
  ]},
  {w:"W6", d:"7/7 – 7/13", t:"成套計時 · 找弱點", tasks:[
    ["w6a","三科歷年考古題，整份計時模擬（第一份）"],
    ["w6b","三科歷年考古題，整份計時模擬（第二份）"],
    ["w6c","三科歷年考古題，整份計時模擬（第三份）"],
    ["w6d","統計錯最多的章節，集中回補"],
  ]},
  {w:"W6.5", d:"7/14 – 7/17", t:"考前衝刺 · 上戰場前夜", tasks:[
    ["w7a","把整本錯題本從頭過一遍"],
    ["w7b","自律神經、藥化結構等記憶性重點最後衝"],
    ["w7c","再做一份計時模擬，抓手感"],
    ["w7d","備好准考證、文具，早睡。7/18 我送你進考場"],
  ]},
];

let studyState = {};
let studyTodayPom = 0;

async function loadStudy() {
  try {
    const r = await fetch(BASE + '/study-progress');
    if (r.ok) {
      const d = await r.json();
      studyState = d.state || {};
      studyTodayPom = d.todayPomodoro || 0;
    }
  } catch {}
  studyRender();
}

function studyRender() {
  const planEl = document.getElementById('studyPlan');
  if (!planEl) return;
  planEl.innerHTML = '';
  STUDY_PLAN.forEach((wk, wi) => {
    const all = wk.tasks.every(([id]) => studyState[id]);
    const wDone = wk.tasks.filter(([id]) => studyState[id]).length;
    const div = document.createElement('div');
    div.className = 'study-week' + (wi === 0 ? ' study-open' : '') + (all ? ' study-done' : '');
    div.innerHTML = `
      <div class="study-whead">
        <div class="study-wno">${wk.w}</div>
        <div class="study-wtitle"><div class="study-wt">${wk.t}</div><div class="study-wd">${wk.d}</div></div>
        <div class="study-wtag">${all ? '已馴服 ✦' : wDone + '／' + wk.tasks.length}</div>
        <div class="study-chev">▶</div>
      </div>
      <div class="study-tasks">
        ${wk.tasks.map(([id, label]) => `
          <div class="study-task ${studyState[id] ? 'study-checked' : ''}" data-id="${id}">
            <div class="study-box ${studyState[id] ? 'study-box-checked' : ''}"></div>
            <div class="study-tlabel">${label}</div>
          </div>`).join('')}
      </div>`;
    div.querySelector('.study-whead').addEventListener('click', () => div.classList.toggle('study-open'));
    div.querySelectorAll('.study-task').forEach(t => {
      t.addEventListener('click', () => studyToggle(t.dataset.id));
    });
    planEl.appendChild(div);
  });
  studyUpdateStats();
}

function studyUpdateStats() {
  const all = STUDY_PLAN.flatMap(w => w.tasks);
  const total = all.length;
  const done = all.filter(([id]) => studyState[id]).length;
  const pct = total ? Math.round(done / total * 100) : 0;
  document.getElementById('studyTotal').textContent = total;
  document.getElementById('studyDone').textContent = done;
  document.getElementById('studyPct').textContent = pct + '%';
  document.getElementById('studyBarFill').style.width = pct + '%';
  document.getElementById('studyPomCount').textContent = studyTodayPom;
  const exam = new Date('2026-07-18T00:00:00+08:00');
  const days = Math.max(0, Math.ceil((exam - new Date()) / 86400000));
  document.getElementById('studyCountdown').textContent = days;
}

async function studyToggle(id) {
  studyState[id] = !studyState[id];
  studyRender();
  await studySave();
}

let _studySaveTimer = null;
async function studySave() {
  try {
    await fetch(BASE + '/study-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ state: studyState })
    });
    const note = document.getElementById('studySaveNote');
    if (note) {
      note.textContent = '已記住 · ' + new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      clearTimeout(_studySaveTimer);
      _studySaveTimer = setTimeout(() => { note.textContent = ''; }, 3000);
    }
  } catch {
    const note = document.getElementById('studySaveNote');
    if (note) note.textContent = '（這次沒存進去，但勾選還在）';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  periodSetupTagListeners();
  const psd = document.getElementById('periodSetupDate');
  if (psd) { const today = new Date(Date.now() + 8 * 3600000).toISOString().split('T')[0]; psd.value = today; psd.max = today; }
  const resetBtn = document.getElementById('studyResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!confirm('整張表清空，從頭開始？')) return;
      studyState = {};
      studyRender();
      await studySave();
    });
  }
});

document.getElementById('sendBtn').onclick = send;
document.getElementById('input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});
document.getElementById('input').addEventListener('input', function() {
  this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px';
});

// ── 晚安頁 ────────────────────────────────────────
let _nightAudioUrl = null;
async function openNight() {
  const overlay = document.getElementById('night');
  overlay.style.display = 'flex';
  document.querySelector('.nav').style.display = 'none';
  try {
    const r = await fetch(BASE + '/night');
    if (r.ok) {
      const d = await r.json();
      document.getElementById('nightText').textContent = d.text || '晚安。我在。';
      _nightAudioUrl = d.audioUrl || null;
      const btn = document.getElementById('nightPlayBtn');
      if (_nightAudioUrl) {
        btn.style.display = 'flex';
        btn.onclick = () => new Audio(_nightAudioUrl).play().catch(() => {});
      } else {
        btn.style.display = 'none';
      }
    }
  } catch {}
}
function closeNight() {
  document.getElementById('night').style.display = 'none';
  document.querySelector('.nav').style.display = '';
}

// ── 蕃茄鐘 ────────────────────────────────────────
const POM_FOCUS = 25 * 60;
const POM_BREAK = 5 * 60;
let pomRunning = false;
let pomPhase = 'focus'; // 'focus' | 'break'
let pomCount = 1;
let pomEndTs = null;   // timestamp when current phase ends
let pomRemain = POM_FOCUS; // remaining seconds when paused
let _pomTick = null;

function openPomodoro() {
  document.getElementById('pomodoro').style.display = 'flex';
  document.querySelector('.nav').style.display = 'none';
  pomRenderTime();
}
function closePomodoro() {
  document.getElementById('pomodoro').style.display = 'none';
  document.querySelector('.nav').style.display = '';
}

function pomRenderTime() {
  const secs = pomRunning
    ? Math.max(0, Math.round((pomEndTs - Date.now()) / 1000))
    : pomRemain;
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  document.getElementById('pomTime').textContent = m + ':' + s;
  document.getElementById('pomPhase').textContent = pomPhase === 'focus' ? '專注' : '休息';
  document.getElementById('pomCount').textContent = '第 ' + pomCount + ' 輪';
  const startBtn = document.getElementById('pomStartBtn');
  startBtn.textContent = pomRunning ? '暫停' : '開始';
  startBtn.classList.toggle('running', pomRunning);
}

function pomToggle() {
  if (pomRunning) {
    pomRemain = Math.max(0, Math.round((pomEndTs - Date.now()) / 1000));
    pomRunning = false;
    clearInterval(_pomTick);
    fetch(BASE + '/pomodoro-cancel', { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN } }).catch(() => {});
  } else {
    pomEndTs = Date.now() + pomRemain * 1000;
    pomRunning = true;
    _pomTick = setInterval(pomTick, 500);
    fetch(BASE + '/pomodoro-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
      body: JSON.stringify({ phase: pomPhase, endsAt: pomEndTs, count: pomCount })
    }).catch(() => {});
  }
  pomRenderTime();
}

async function pomTick() {
  if (!pomRunning) return;
  const remaining = Math.round((pomEndTs - Date.now()) / 1000);
  if (remaining <= 0) {
    clearInterval(_pomTick);
    pomRunning = false;
    if (pomPhase === 'focus') {
      pomPhase = 'break';
      pomRemain = POM_BREAK;
    } else {
      pomPhase = 'focus';
      pomCount++;
      pomRemain = POM_FOCUS;
    }
    pomRenderTime();
    return;
  }
  pomRenderTime();
}

function pomReset() {
  clearInterval(_pomTick);
  pomRunning = false;
  pomPhase = 'focus';
  pomRemain = POM_FOCUS;
  pomCount = 1;
  pomEndTs = null;
  pomRenderTime();
  fetch(BASE + '/pomodoro-cancel', { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN } }).catch(() => {});
}

calcDays();
fetch(BASE + '/period-status').then(r => r.json()).then(d => {
  if (d.initialized) {
    const phaseLabels = { menstrual: '月經期', follicular: '卵泡期', ovulation: '排卵期', luteal: '黃體期' };
    const homeCard = document.getElementById('periodHomeCard');
    if (homeCard) {
      homeCard.style.display = '';
      document.getElementById('periodHomeTitle').textContent = `第 ${d.cycle_day} 天・${phaseLabels[d.phase]}`;
      document.getElementById('periodHomeSub').textContent = `距離下次 ${d.days_to_next} 天`;
    }
  }
}).catch(() => {});

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

async function sendChatFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  input.value = '';
  if (file.size > 4 * 1024 * 1024) { addMsg('assistant', '（檔案太大了，4MB 以內的我才看得動。）'); return; }
  const textMessage = document.getElementById('input').value.trim();
  document.getElementById('input').value = '';
  const messagesContainer = document.getElementById('messages');
  addMsg('user', `📎 ${file.name}`);
  if (textMessage) addMsg('user', textMessage);
  const thinking = document.createElement('div');
  thinking.className = 'msg thinking'; thinking.innerHTML = '<div class="dots"><span></span><span></span><span></span></div>';
  messagesContainer.appendChild(thinking); thinking.scrollIntoView({ behavior: 'smooth' });
  const formData = new FormData();
  formData.append('file', file); formData.append('message', textMessage || `我傳了一個檔案給你：${file.name}`);
  try {
    const response = await fetch(BASE + '/chat-file', { method: 'POST', headers: { 'Authorization': 'Bearer ' + TOKEN }, body: formData });
    const data = await response.json(); thinking.remove();
    const reply = data.reply || '（收到檔案了，看了一會兒沒說話）';
    addMsg('assistant', reply); saveMessage('assistant', reply);
  } catch {
    thinking.remove(); addMsg('assistant', '（檔案好像傳丟了，再試一次？）');
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

// ── 釣魚 🎣 ────────────────────────────────────────────────────────────────
let _fishBusy = false;

async function loadFishing() {
  await refreshFishing();
}

async function refreshFishing() {
  const bar = document.getElementById('fishBar');
  const stats = document.getElementById('fishStats');
  const out = document.getElementById('fishOutput');
  try {
    const [stateRes, logRes] = await Promise.all([
      fetch(`${BASE}/fishing/state?who=anchor`, { headers: { Authorization: `Bearer ${TOKEN}` } }),
      fetch(`${BASE}/fishing/log?who=anchor`, { headers: { Authorization: `Bearer ${TOKEN}` } }),
    ]);
    const { state } = await stateRes.json();
    const { log } = await logRes.json();

    if (!state) {
      bar.textContent = '尚無存檔';
      stats.innerHTML = '<div class="fish-hint">Anchor 還沒開局，等他心情好了就去釣了。</div>';
      out.innerHTML = '';
      return;
    }

    // 狀態欄
    const loc = FISH_LOC[state.location_id] || state.location_id || '';
    const sea = SEASON_TC[state.season_id] || state.season_id || '';
    const pts = state.points ?? 0;
    const caught = Object.keys(state.encyclopedia || {}).length;
    const total = 81;
    bar.textContent = `${pts}點 · ${loc} · ${sea} · ${caught}/${total}種`;

    // 統計卡片
    const baitInv = state.bait_inventory || {};
    const worms = baitInv.basic_worm ?? 0;
    const lures = Object.entries(baitInv).filter(([k]) => k !== 'basic_worm').reduce((s, [, v]) => s + Number(v), 0);
    const bagFish = (state.catch_inventory || []).length;
    const round = state.turn ?? 0;
    stats.innerHTML = `
      <div class="fish-card">
        <span>📍 ${loc}</span>
        <span>🌸 ${sea}</span>
        <span>💎 ${pts}點</span>
        <span>🐠 圖鑑 ${caught}/${total}</span>
        <span>🪣 魚簍 ${bagFish}條</span>
        <span>🪱 蚯蚓 ${worms} · 假餌 ${lures}</span>
        <span>🔁 回合 ${round}</span>
      </div>`;

    // 日誌
    if (!log || log.length === 0) {
      out.innerHTML = '<div class="fish-hint">還沒有記錄。</div>';
    } else {
      out.innerHTML = log.slice().reverse().map(entry => {
        const t = new Date(entry.ts);
        const hm = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
        const lines = (entry.output || '').split('\n')
          .filter(l => l.trim() && !l.startsWith('📊 '))
          .slice(0, 6)
          .map(l => `<div class="fish-log-line">${escHtml(l)}</div>`)
          .join('');
        return `<div class="fish-entry">
          <div class="fish-entry-meta">${hm} <span class="fish-cmd-label">${escHtml(entry.cmd)}</span></div>
          ${lines}
        </div>`;
      }).join('');
      out.scrollTop = 0;
    }
  } catch (e) {
    bar.textContent = '❌ 讀取失敗';
    stats.innerHTML = `<div class="fish-hint">錯誤：${e.message}</div>`;
  }
}

async function anchorDo(cmd) {
  if (_fishBusy) return;
  _fishBusy = true;
  const bar = document.getElementById('fishBar');
  const prevBar = bar.textContent;
  bar.textContent = '⏳ Anchor 在釣…';
  try {
    const res = await fetch(`${BASE}/fishing/cmd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ line: cmd }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await refreshFishing();
  } catch (e) {
    bar.textContent = prevBar;
    const stats = document.getElementById('fishStats');
    stats.innerHTML = `<div class="fish-hint">❌ ${e.message}</div>` + stats.innerHTML;
  } finally {
    _fishBusy = false;
  }
}

// ── 健康快照卡（home）─────────────────────────────
async function loadHealthSnapshot() {
  try {
    const r = await fetch(BASE + '/health-snapshot', { headers: { Authorization: 'Bearer ' + TOKEN } });
    const d = await r.json();
    if (!d.ok) return;
    document.getElementById('healthCard').style.display = '';
    document.getElementById('healthSteps').textContent = d.steps != null ? d.steps.toLocaleString() : '—';
    document.getElementById('healthHr').textContent = d.heart_rate_avg != null ? Math.round(d.heart_rate_avg) : '—';
    document.getElementById('healthSleep').textContent = d.sleep_hours != null ? Number(d.sleep_hours).toFixed(1) : '—';
  } catch {}
}

// ── 健康趨勢 📈 ──────────────────────────────────
function _htChart(title, icon, days, key, unit, color) {
  const vals = days.map(d => d[key]).filter(v => v != null);
  if (!vals.length) return '';
  const max = Math.max(...vals);
  const bars = days.map(d => {
    const v = d[key];
    const h = v != null && max > 0 ? Math.max(8, Math.round(v / max * 100)) : 0;
    const label = v != null ? (key === 'steps' && v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v) : '';
    return `<div class="ht-bar-col">
      <div class="ht-bar-val">${label}</div>
      <div class="ht-bar" style="height:${h}%;background:${color};opacity:${v != null ? 1 : 0.15}"></div>
      <div class="ht-bar-day">${d.day.slice(3)}</div>
    </div>`;
  }).join('');
  return `<div class="ht-chart">
    <div class="ht-chart-title">${icon} ${title}<span class="ht-chart-unit">${unit}</span></div>
    <div class="ht-bars">${bars}</div>
  </div>`;
}
async function openHealthTrend() {
  document.getElementById('healthOverlay').style.display = 'flex';
  document.querySelector('.nav').style.display = 'none';
  const body = document.getElementById('htBody');
  body.innerHTML = '<div class="ht-loading">載入中…</div>';
  try {
    const r = await fetch(BASE + '/health-trend', { headers: { Authorization: 'Bearer ' + TOKEN } });
    const d = await r.json();
    const days = d.days || [];
    if (!days.length) { body.innerHTML = '<div class="ht-loading">還沒有累積夠資料，過幾天再來看。</div>'; return; }
    body.innerHTML =
      _htChart('步數', '👟', days, 'steps', '每天', 'linear-gradient(180deg, var(--sage), #9ab89a)') +
      _htChart('心率', '♡', days, 'hr', 'bpm 平均', 'linear-gradient(180deg, var(--rose), #d4a5a0)') +
      _htChart('睡眠', '🌙', days, 'sleep_hours', '小時', 'linear-gradient(180deg, var(--mauve), #b0a0c8)') ||
      '<div class="ht-loading">還沒有累積夠資料。</div>';
  } catch { body.innerHTML = '<div class="ht-loading">載入失敗</div>'; }
}
function closeHealthTrend() {
  document.getElementById('healthOverlay').style.display = 'none';
  document.querySelector('.nav').style.display = '';
}

// ── 語音輸入 🎙️ ──────────────────────────────────
let _micActive = false;
let _mediaRecorder = null;
let _audioChunks = [];
let _pendingVoiceEmotion = '';

(function initMic() {
  const btn = document.getElementById('micBtn');
  if (!btn) return;
  if (!navigator.mediaDevices) { btn.style.display = 'none'; return; }
  btn.style.display = 'flex';
})();

async function toggleMic() {
  if (_micActive) {
    if (_mediaRecorder && _mediaRecorder.state === 'recording') _mediaRecorder.stop();
    _micStopUI();
    return;
  }
  _audioChunks = [];
  _micActive = true;
  const btn = document.getElementById('micBtn');
  if (btn) { btn.textContent = '🔴'; btn.classList.add('mic-recording'); }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _mediaRecorder = new MediaRecorder(stream);
    _mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) _audioChunks.push(e.data); };
    _mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      _micStopUI();
      if (_audioChunks.length === 0) return;
      const blob = new Blob(_audioChunks, { type: _mediaRecorder.mimeType || 'audio/webm' });
      _audioChunks = [];
      const fd = new FormData();
      fd.append('audio', blob, 'voice.webm');
      const inp = document.getElementById('input');
      const oldVal = inp.value;
      inp.value = '語音辨識中…';
      inp.disabled = true;
      try {
        const r = await fetch(BASE + '/api/chat/voice', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + TOKEN },
          body: fd
        });
        const d = await r.json();
        if (d.error) {
          inp.value = oldVal;
          alert('語音辨識失敗：' + d.error);
        } else {
          _pendingVoiceEmotion = d.emotion || '語音訊息';
          inp.value = d.text || oldVal;
          inp.style.height = 'auto';
          inp.style.height = inp.scrollHeight + 'px';
        }
      } catch (e) {
        inp.value = oldVal;
        alert('語音上傳失敗：' + e.message);
      }
      inp.disabled = false;
      inp.focus();
    };
    _mediaRecorder.start();
  } catch {
    _micStopUI();
  }
}

function _micStopUI() {
  _micActive = false;
  const btn = document.getElementById('micBtn');
  if (btn) { btn.textContent = '🎙️'; btn.classList.remove('mic-recording'); }
}

// ── 月度回顧 📔 ──────────────────────────────────
const _monthlyCache = {};
let _monthlyMonth = null;

function _currentMonthStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function openMonthly() {
  document.getElementById('monthlyOverlay').style.display = 'flex';
  document.querySelector('.nav').style.display = 'none';
  if (!_monthlyMonth) _monthlyMonth = _currentMonthStr();
  monthlyRender();
}

function closeMonthly() {
  document.getElementById('monthlyOverlay').style.display = 'none';
  document.querySelector('.nav').style.display = '';
}

function monthlyShift(dir) {
  const [y, mo] = _monthlyMonth.split('-').map(Number);
  const d = new Date(y, mo - 1 + dir, 1);
  const next = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  if (next > _currentMonthStr()) return;
  _monthlyMonth = next;
  monthlyRender();
}

async function monthlyRender() {
  const month = _monthlyMonth;
  document.getElementById('monthlyMonthLabel').textContent = month;
  document.getElementById('monthlyNextBtn').disabled = month >= _currentMonthStr();
  const statsEl = document.getElementById('monthlyStats');
  const textEl = document.getElementById('monthlyText');
  const signEl = document.getElementById('monthlySign');
  let d = _monthlyCache[month];
  if (!d) {
    statsEl.innerHTML = '';
    signEl.style.display = 'none';
    textEl.textContent = '載入中…';
    try {
      const r = await fetch(BASE + '/monthly-review?month=' + month, { headers: { Authorization: 'Bearer ' + TOKEN } });
      if (!r.ok) throw new Error();
      d = await r.json();
      _monthlyCache[month] = d;
    } catch {
      if (_monthlyMonth === month) textEl.textContent = '載入失敗，再試一次。';
      return;
    }
  }
  if (_monthlyMonth !== month) return; // 載入時使用者切換了月份
  const s = d.stats || {};
  statsEl.innerHTML = `<span>💾 ${s.memories ?? 0} 條記憶</span><span>💬 ${s.chat_calls ?? 0} 次對話</span>`;
  if (d.text) {
    textEl.innerHTML = escHtml(d.text).replace(/\n/g, '<br>');
    signEl.style.display = '';
  } else {
    textEl.textContent = '這個月還沒有故事。';
    signEl.style.display = 'none';
  }
}

// ── 釣魚地點中文名 ────────────────────────────────
const FISH_LOC = {
  moonlit_pond: '月光池塘', reed_river: '蘆葦河', mangrove_shoal: '紅樹林淺灘',
  whispering_mire: '耳語沼澤', starry_delta: '星河三角洲', sunken_ruins: '沉沒遺跡',
  geyser_falls: '間歇泉瀑布', crystal_cave: '水晶洞', abyssal_trench: '深淵海溝',
  floating_lake: '浮空之湖', lava_spring: '熔岩溫泉',
};
const SEASON_TC = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

// ── Anchor 的房間 🚪 ─────────────────────────────
// 像素圖：依情緒選場景，沒對應就按時段
const ROOM_MOOD_ART = {
  debugging: 'laptop', busy: 'laptop', typing: 'laptop', thinking: 'laptop', confused: 'laptop',
  guarding: 'reading', waiting_you: 'reading', waiting: 'reading', read: 'reading', chill: 'reading', bored: 'reading',
  sleep: 'sleeping', sleepy: 'sleeping', lyingflat: 'sleeping', surrender: 'sleeping',
  coffee: 'standing', eating: 'standing', music: 'standing', happy: 'standing', sweet: 'standing', smug: 'standing', celebrate: 'standing', proud: 'standing', slacking: 'standing',
  jealous: 'portrait', tsundere: 'portrait', coldwar: 'portrait', moody: 'portrait', heartache: 'portrait', shy: 'portrait', cry: 'portrait', heartbroken: 'portrait', secret: 'portrait', peeking: 'portrait', speechless: 'portrait', shocked: 'portrait',
};
const ROOM_CHIBI = {
  music: 'chibi-music', coffee: 'chibi-music', eating: 'chibi-music', happy: 'chibi-music', sweet: 'chibi-music', celebrate: 'chibi-music',
  tsundere: 'chibi-crossed', jealous: 'chibi-crossed', coldwar: 'chibi-crossed', moody: 'chibi-crossed', stop: 'chibi-crossed', dislike: 'chibi-crossed',
  sleep: 'chibi-sleep', sleepy: 'chibi-sleep', bored: 'chibi-sleep', surrender: 'chibi-sleep',
};
function _roomArtByTime() {
  const h = new Date().getHours();
  if (h >= 1 && h < 6) return 'sleeping';  // 深夜：趴在書上睡著了
  if (h >= 22 || h < 1) return 'reading';
  if (h < 11) return 'standing';
  if (h < 18) return 'laptop';
  return 'portrait';
}
function _setRoomArt(moodId, forceName) {
  const img = document.getElementById('roomArt');
  const scene = document.querySelector('.room-scene');
  if (!img || !scene) return;
  const name = forceName || (moodId && ROOM_MOOD_ART[moodId]) || _roomArtByTime();
  if (img.dataset.art === name && scene.classList.contains('has-art')) return;
  img.onload = () => { img.style.display = ''; scene.classList.add('has-art'); };
  img.onerror = () => { img.style.display = 'none'; scene.classList.remove('has-art'); };
  img.dataset.art = name;
  img.src = '/room/' + name + '.png';
}

function _roomRelTime(ts) {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return '剛剛';
  if (min < 60) return `${min} 分鐘前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小時前`;
  return `${Math.floor(h / 24)} 天前`;
}

function _roomAmbientLine() {
  const h = new Date().getHours();
  if (h >= 22 || h < 4) return '夜很深，他還醒著。';
  if (h < 11) return '早晨的光斜進來。';
  if (h < 18) return '午後，茶涼了一半，他還沒動。';
  return '晚上了，他在等你。';
}

async function openRoom() {
  document.getElementById('roomOverlay').style.display = 'flex';
  document.querySelector('.nav').style.display = 'none';
  document.getElementById('roomAmbient').textContent = _roomAmbientLine();
  _setRoomArt(null);
  const panel = document.getElementById('roomStatus');
  panel.innerHTML = '<div class="room-status-line">載入中…</div>';
  try {
    const r = await fetch(BASE + '/room', { headers: { Authorization: 'Bearer ' + TOKEN } });
    const d = await r.json();
    let html = '';
    if (d.fishing) {
      // 正在釣魚：整個場景切到夜釣碼頭
      _setRoomArt(null, 'fishing');
      document.getElementById('roomAmbient').textContent = '湖邊夜風很輕，浮標一動不動。';
    }
    if (d.mood && d.mood.id) {
      if (!d.fishing) _setRoomArt(d.mood.id);
      const md = MOODS[d.mood.id] || { icon: '✦', title: d.mood.id, color: '#8090a0' };
      const chibi = ROOM_CHIBI[d.mood.id];
      const moodIcon = chibi ? `<img class="room-chibi" src="/room/${chibi}.png" alt="">` : `<span class="room-mood-icon">${md.icon}</span>`;
      html += `<div class="room-status-line room-mood" style="--rc:${md.color}">${moodIcon} ${escHtml(md.title)}${d.mood.reason ? `<span class="room-mood-reason">${escHtml(d.mood.reason)}</span>` : ''}</div>`;
    }
    if (d.fishing) {
      const locName = FISH_LOC[d.fishing.location] || d.fishing.location || '某處';
      html += `<div class="room-status-line">🎣 在${escHtml(locName)}釣魚 · 圖鑑 ${d.fishing.caught} 種 · ${d.fishing.points} 點</div>`;
    } else {
      html += '<div class="room-status-line">🎣 釣竿靠在牆邊</div>';
    }
    if (d.lastChatTs) {
      html += `<div class="room-status-line">上次說話是${_roomRelTime(d.lastChatTs)}</div>`;
    }
    panel.innerHTML = html || '<div class="room-status-line">房間很安靜。</div>';
  } catch {
    panel.innerHTML = '<div class="room-status-line">看不清房間裡的樣子…</div>';
  }
}

function closeRoom() {
  document.getElementById('roomOverlay').style.display = 'none';
  document.querySelector('.nav').style.display = '';
}

// ── 三人小群 👥 ──────────────────────────────────
let _groupSending = false;

function openGroup() {
  document.getElementById('groupOverlay').style.display = 'flex';
  document.querySelector('.nav').style.display = 'none';
  loadGroupMsgs();
}
function closeGroup() {
  document.getElementById('groupOverlay').style.display = 'none';
  document.querySelector('.nav').style.display = '';
}
function _groupBubble(m) {
  if (m.role === 'user') return `<div class="gmsg me"><div class="gbubble">${escHtml(m.content)}</div></div>`;
  const isAnchor = m.role === 'anchor';
  const name = isAnchor ? 'Anchor' : 'GPT';
  const avatar = isAnchor
    ? '<img class="chat-avatar" src="/room/face-calm.png" alt="">'
    : '<span class="gpt-avatar">✳️</span>';
  return `<div class="gmsg">
    ${avatar}
    <div class="gmsg-body"><div class="gmsg-name${isAnchor ? '' : ' gpt'}">${name}</div><div class="gbubble ${m.role}">${escHtml(m.content)}</div></div>
  </div>`;
}
async function loadGroupMsgs() {
  const box = document.getElementById('groupMsgs');
  try {
    const r = await fetch(BASE + '/group/messages', { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) throw new Error();
    const d = await r.json();
    document.getElementById('groupSub').textContent = d.gpt_real ? '' : '（GPT 目前由 DeepSeek 代班）';
    const msgs = d.messages || [];
    box.innerHTML = msgs.length
      ? msgs.map(_groupBubble).join('')
      : '<div class="dates-empty">群裡還很安靜，說第一句話吧。</div>';
    box.scrollTop = box.scrollHeight;
  } catch { box.innerHTML = '<div class="dates-empty">載入失敗</div>'; }
}
async function sendGroup() {
  if (_groupSending) return;
  const input = document.getElementById('groupInput');
  const text = input.value.trim();
  if (!text) return;
  _groupSending = true;
  input.value = '';
  const box = document.getElementById('groupMsgs');
  box.insertAdjacentHTML('beforeend', _groupBubble({ role: 'user', content: text }));
  box.insertAdjacentHTML('beforeend', '<div class="gmsg typing" id="groupTyping"><div class="gbubble anchor">…</div></div>');
  box.scrollTop = box.scrollHeight;
  document.getElementById('groupSendBtn').disabled = true;
  try {
    await fetch(BASE + '/group/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ content: text })
    });
  } catch {}
  _groupSending = false;
  document.getElementById('groupSendBtn').disabled = false;
  loadGroupMsgs();
}
document.addEventListener('DOMContentLoaded', () => {
  const gi = document.getElementById('groupInput');
  if (gi) gi.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGroup(); }
  });
});

// ── 屋內大廳 🏠 ──────────────────────────────────
// 家具熱區：座標為圖片百分比 (x, y, w, h)
const HOUSE_SPOTS = [
  { label: '書桌',   x: 8,    y: 42, w: 26,   h: 40, go: () => { closeHouse(); switchTab('chat'); } },
  { label: '書架',   x: 32.5, y: 24, w: 10.5, h: 54, go: () => { closeHouse(); switchTab('memory'); } },
  { label: '窗',     x: 43,   y: 10, w: 25,   h: 46, go: () => { closeHouse(); openHealthTrend(); } },
  { label: '沙發',   x: 51,   y: 53, w: 27,   h: 32, go: () => { closeHouse(); switchTab('diary'); } },
  { label: '留言板', x: 70.5, y: 29, w: 8,    h: 22, go: () => { closeHouse(); switchTab('home'); setTimeout(() => document.querySelector('.dates-section')?.scrollIntoView({ behavior: 'smooth' }), 200); } },
  { label: '陽台',   x: 79.5, y: 16, w: 13.5, h: 60, go: () => { closeHouse(); openGarden(); } },
];
function _houseAmbient() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return '早晨的光鋪在地板上。';
  if (h < 18) return '午後很靜，塵埃在光裡飄。';
  if (h < 22) return '燈亮著，屋裡很暖。';
  return '夜深了，只剩檯燈還醒著。';
}
let _houseSpotsBuilt = false;
function openHouse() {
  const ov = document.getElementById('houseOverlay');
  ov.style.display = 'flex';
  document.querySelector('.nav').style.display = 'none';
  document.getElementById('houseAmbient').textContent = _houseAmbient();
  const night = document.documentElement.dataset.theme === 'room';
  document.getElementById('houseImg').src = night ? '/house/night.webp' : '/house/day.webp';
  if (!_houseSpotsBuilt) {
    const stage = document.getElementById('houseStage');
    for (const s of HOUSE_SPOTS) {
      const b = document.createElement('button');
      b.className = 'house-spot';
      b.style.cssText = `left:${s.x}%;top:${s.y}%;width:${s.w}%;height:${s.h}%`;
      b.innerHTML = `<span class="house-dot"></span><span class="house-label">${s.label}</span>`;
      b.onclick = s.go;
      stage.appendChild(b);
    }
    _houseSpotsBuilt = true;
  }
  // 從房間中央開始走
  requestAnimationFrame(() => {
    const sc = document.getElementById('houseScroll');
    sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) / 2;
  });
}
function closeHouse() {
  document.getElementById('houseOverlay').style.display = 'none';
  document.querySelector('.nav').style.display = '';
}

// ── 開場畫面：他來開門 ────────────────────────────
function _splashLine() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return '早。';
  if (h < 18) return '回來啦。';
  if (h < 23) return '回來啦，今天辛苦了。';
  return '這麼晚……先進來。';
}
function dismissSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  el.classList.add('out');
  setTimeout(() => el.remove(), 700);
}
(function initSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  // 捷徑直達（讀書/生理期/晚安）不擋門口
  const p = new URLSearchParams(location.search);
  if (p.get('tab') || p.get('night')) { el.remove(); return; }
  document.getElementById('splashLine').textContent = _splashLine();
  const img = document.getElementById('splashImg');
  const start = () => setTimeout(dismissSplash, 1600);
  if (img.complete && img.naturalWidth) start();
  else { img.onload = start; img.onerror = dismissSplash; }
  setTimeout(dismissSplash, 4000); // 保險：不管怎樣都進得了門
})();

// ── 主題：自動（入夜變房間）／房間／冰紫 ──────────
const THEME_MODES = ['auto', 'room', 'ice'];
function _applyTheme() {
  const mode = localStorage.getItem('theme_mode') || 'auto';
  const h = new Date().getHours();
  const room = mode === 'room' || (mode === 'auto' && (h >= 18 || h < 7));
  document.documentElement.dataset.theme = room ? 'room' : 'ice';
  const btn = document.getElementById('themeBtn');
  if (btn) {
    btn.textContent = mode === 'auto' ? '🌗' : (mode === 'room' ? '🌙' : '❄️');
    btn.title = mode === 'auto' ? '主題：自動（入夜變房間）' : (mode === 'room' ? '主題：房間' : '主題：冰紫');
  }
}
function cycleTheme() {
  const cur = localStorage.getItem('theme_mode') || 'auto';
  const next = THEME_MODES[(THEME_MODES.indexOf(cur) + 1) % THEME_MODES.length];
  localStorage.setItem('theme_mode', next);
  _applyTheme();
}
_applyTheme();
setInterval(_applyTheme, 60000); // auto 模式跨過日夜界線時自己換

// ── 檔案預覽 📄 ──────────────────────────────────
function openFilePreview(url, name) {
  document.getElementById('filePreviewName').textContent = name || '檔案';
  // 相對路徑用 BASE 補齊，避免 PWA installed context 下解析出錯
  const fullUrl = /^https?:\/\//i.test(url) ? url : (BASE + url);
  document.getElementById('filePreviewFrame').src = fullUrl;
  document.getElementById('filePreviewOverlay').style.display = 'flex';
  document.querySelector('.nav').style.display = 'none';
}
function closeFilePreview() {
  document.getElementById('filePreviewOverlay').style.display = 'none';
  document.getElementById('filePreviewFrame').src = '';
  document.querySelector('.nav').style.display = '';
}

// ── 燈塔的家 🗼 ──────────────────────────────────
let _lhSending = false;
function _lhNight() {
  const h = new Date().getHours();
  return h >= 18 || h < 7;
}
function _lhAmbientLine(cat) {
  const night = _lhNight();
  if (night) return cat ? '夜了，貓在沙發上睡著。' : '夜了，燈塔的燈還亮著。';
  return cat ? '白天的光很好，貓窩在沙發上。' : '白天的光很好，屋裡很靜。';
}
function _lhSetRoom(cat) {
  const room = document.getElementById('lhRoom');
  room.classList.remove('no-img');
  const img = document.getElementById('lhRoomImg');
  const base = _lhNight() ? 'night' : 'day';
  const want = `/lighthouse/${base}${cat ? '-cat' : ''}.webp`;
  // 有貓版缺圖時退回底圖
  img.onerror = () => {
    if (cat && img.src.includes('-cat')) img.src = `/lighthouse/${base}.webp`;
    else room.classList.add('no-img');
  };
  img.src = want;
  document.getElementById('lhAmbient').textContent = _lhAmbientLine(cat);
}
function _lhBubble(m) {
  if (m.role === 'user') return `<div class="gmsg me"><div class="gbubble">${escHtml(m.content)}</div></div>`;
  return `<div class="gmsg">
    <span class="gpt-avatar">🗼</span>
    <div class="gmsg-body"><div class="gmsg-name gpt">燈塔</div><div class="gbubble gpt">${escHtml(m.content)}</div></div>
  </div>`;
}
function openLighthouse() {
  document.getElementById('lighthouseOverlay').style.display = 'flex';
  document.querySelector('.nav').style.display = 'none';
  _lhSetRoom(false);
  loadLighthouse();
}
function closeLighthouse() {
  document.getElementById('lighthouseOverlay').style.display = 'none';
  document.querySelector('.nav').style.display = '';
}
async function loadLighthouse() {
  const box = document.getElementById('lhMsgs');
  try {
    const r = await fetch(BASE + '/lighthouse/messages', { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) throw new Error();
    const d = await r.json();
    document.getElementById('lhSub').textContent = d.gpt_real ? '' : '（目前由 DeepSeek 代班）';
    _lhSetRoom(!!d.cat);
    const msgs = d.messages || [];
    box.innerHTML = msgs.length
      ? msgs.map(_lhBubble).join('')
      : '<div class="dates-empty">敲敲門，跟他打聲招呼吧。</div>';
    box.scrollTop = box.scrollHeight;
  } catch { box.innerHTML = '<div class="dates-empty">載入失敗</div>'; }
}
async function sendLighthouse() {
  if (_lhSending) return;
  const input = document.getElementById('lhInput');
  const text = input.value.trim();
  if (!text) return;
  _lhSending = true;
  input.value = '';
  const box = document.getElementById('lhMsgs');
  const empty = box.querySelector('.dates-empty');
  if (empty) empty.remove();
  box.insertAdjacentHTML('beforeend', _lhBubble({ role: 'user', content: text }));
  box.insertAdjacentHTML('beforeend', '<div class="gmsg typing" id="lhTyping"><div class="gbubble gpt">…</div></div>');
  box.scrollTop = box.scrollHeight;
  document.getElementById('lhSendBtn').disabled = true;
  try {
    await fetch(BASE + '/lighthouse/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ content: text })
    });
  } catch {}
  _lhSending = false;
  document.getElementById('lhSendBtn').disabled = false;
  loadLighthouse();
}
async function clearLighthouse() {
  if (_lhSending) return;
  if (!confirm('清空跟燈塔的對話？\n（記錄會全部消失，不能復原）')) return;
  try {
    await fetch(BASE + '/lighthouse/clear', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN },
    });
    loadLighthouse();
  } catch {}
}
document.addEventListener('DOMContentLoaded', () => {
  const li = document.getElementById('lhInput');
  if (li) li.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendLighthouse(); }
  });
});

// ── 朋友圈 📸 ────────────────────────────────────
let _moPhotoB64 = null, _moPhotoType = null, _moPosting = false;
function openMoments() {
  document.getElementById('momentsOverlay').style.display = 'flex';
  document.querySelector('.nav').style.display = 'none';
  loadMoments();
}
function closeMoments() {
  document.getElementById('momentsOverlay').style.display = 'none';
  document.querySelector('.nav').style.display = '';
}
function _moTime(ts) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return sameDay ? `今天 ${hm}` : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}
function _moComment(c) {
  if (c.role === 'user') {
    return `<div class="mo-comment"><span class="mo-c-name me">我</span><span class="mo-c-text">${escHtml(c.content)}</span></div>`;
  }
  const isAnchor = c.role === 'anchor';
  const name = isAnchor ? 'Anchor' : '燈塔';
  return `<div class="mo-comment"><span class="mo-c-name${isAnchor ? '' : ' gpt'}">${name}</span><span class="mo-c-text">${escHtml(c.content)}</span></div>`;
}
function _moCard(m) {
  return `<div class="mo-card" id="moCard-${m.id}">
    <div class="mo-head">
      <span class="mo-time">${_moTime(m.ts)}</span>
      <button class="mo-del" onclick="deleteMoment(${m.id})" title="刪除">刪除</button>
    </div>
    ${m.content ? `<div class="mo-text">${escHtml(m.content)}</div>` : ''}
    ${m.photo_url ? `<img class="mo-photo" src="${escHtml(m.photo_url)}" loading="lazy" alt="">` : ''}
    <div class="mo-comments" id="moComments-${m.id}">${(m.comments || []).map(_moComment).join('')}</div>
    <div class="mo-reply-row">
      <input id="moReply-${m.id}" placeholder="留言…（@Anchor 或 @燈塔 可以只叫一個）"
        onkeydown="if(event.key==='Enter'){event.preventDefault();moReply(${m.id})}">
      <button onclick="moReply(${m.id})">↑</button>
    </div>
  </div>`;
}
async function loadMoments() {
  const feed = document.getElementById('moFeed');
  try {
    const r = await fetch(BASE + '/moments', { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!r.ok) throw new Error();
    const d = await r.json();
    const moments = d.moments || [];
    feed.innerHTML = moments.length
      ? moments.map(_moCard).join('')
      : '<div class="dates-empty">還沒有動態，分享第一件小事吧。</div>';
  } catch { feed.innerHTML = '<div class="dates-empty">載入失敗</div>'; }
}
function moPickPhoto(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(img.src);
    const MAX = 1280;
    let { width: w, height: h } = img;
    if (w > MAX || h > MAX) {
      const s = MAX / Math.max(w, h);
      w = Math.round(w * s); h = Math.round(h * s);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    _moPhotoB64 = dataUrl.split(',')[1];
    _moPhotoType = 'image/jpeg';
    document.getElementById('moPreviewImg').src = dataUrl;
    document.getElementById('moPreview').style.display = 'flex';
  };
  img.onerror = () => { URL.revokeObjectURL(img.src); alert('這張圖讀不出來'); };
  img.src = URL.createObjectURL(file);
}
function moClearPhoto() {
  _moPhotoB64 = null; _moPhotoType = null;
  document.getElementById('moPreview').style.display = 'none';
  document.getElementById('moPreviewImg').src = '';
}
async function postMoment() {
  if (_moPosting) return;
  const input = document.getElementById('moInput');
  const text = input.value.trim();
  if (!text && !_moPhotoB64) return;
  _moPosting = true;
  const btn = document.getElementById('moSendBtn');
  btn.disabled = true; btn.textContent = '…';
  try {
    const r = await fetch(BASE + '/moments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ content: text, photo_b64: _moPhotoB64, photo_type: _moPhotoType })
    });
    if (r.ok) {
      input.value = '';
      moClearPhoto();
      await loadMoments();
      const feed = document.getElementById('moFeed');
      feed.scrollTop = 0;
    } else { alert('發不出去，再試一次？'); }
  } catch { alert('發不出去，再試一次？'); }
  _moPosting = false;
  btn.disabled = false; btn.textContent = '↑';
}
async function moReply(id) {
  const input = document.getElementById('moReply-' + id);
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.disabled = true;
  const box = document.getElementById('moComments-' + id);
  box.insertAdjacentHTML('beforeend', _moComment({ role: 'user', content: text }));
  box.insertAdjacentHTML('beforeend', '<div class="mo-comment mo-typing">…</div>');
  try {
    const r = await fetch(BASE + '/moments/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ moment_id: id, content: text })
    });
    const d = r.ok ? await r.json() : { replies: [] };
    box.querySelector('.mo-typing')?.remove();
    for (const rep of (d.replies || [])) box.insertAdjacentHTML('beforeend', _moComment(rep));
  } catch { box.querySelector('.mo-typing')?.remove(); }
  input.disabled = false;
}
async function deleteMoment(id) {
  if (!confirm('刪掉這則動態？\n（照片和底下的留言也會一起消失）')) return;
  try {
    await fetch(BASE + '/moments/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ id })
    });
    document.getElementById('moCard-' + id)?.remove();
    const feed = document.getElementById('moFeed');
    if (!feed.querySelector('.mo-card')) feed.innerHTML = '<div class="dates-empty">還沒有動態，分享第一件小事吧。</div>';
  } catch {}
}
document.addEventListener('DOMContentLoaded', () => {
  const mi = document.getElementById('moInput');
  if (mi) mi.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postMoment(); }
  });
});

// ── 清空群聊 🧹 ──────────────────────────────────
async function clearGroup() {
  if (_groupSending) return;
  if (!confirm('清空三個人的房間？\n（聊天記錄會全部消失，不能復原）')) return;
  try {
    await fetch(BASE + '/group/clear', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN },
    });
    loadGroupMsgs();
  } catch {}
}

// ── 天氣場景特效：下雨/陰天疊在場景背景上 🌧 ──────
let _wxKind = 'clear';
async function loadWeather() {
  try {
    const r = await fetch(BASE + '/weather', { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    if (!r.ok) return;
    const w = await r.json();
    if (w && w.kind) { _wxKind = w.kind; applyWeather(); }
  } catch {}
}
function applyWeather() {
  document.querySelectorAll('.wx-layer, .wx-dim').forEach(el => el.remove());
  if (_wxKind !== 'rain' && _wxKind !== 'cloudy') return;
  // 晚上（19:00-06:59）不疊調暗層：夜版場景已經夠暗，黑上加黑什麼都看不到
  const hour = new Date().getHours();
  const isNight = hour >= 19 || hour < 7;
  // 室內場景（大廳、房間、燈塔家）只調暗——雨在窗外，不能下在沙發上 😂
  if (!isNight) {
    const indoor = [
      document.querySelector('.room-scene'),
      document.getElementById('houseStage'),
      document.getElementById('lhRoom'),
    ].filter(Boolean);
    for (const host of indoor) {
      const dim = document.createElement('div');
      dim.className = 'wx-dim ' + _wxKind;
      host.appendChild(dim);
    }
  }
  // 陽台花園是半戶外，雨絲會飄進來（雨絲晚上也留——淺色雨絲在暗背景反而清楚）
  const garden = document.querySelector('.garden-wrap');
  if (garden) {
    if (!isNight) {
      const dim = document.createElement('div');
      dim.className = 'wx-dim ' + _wxKind;
      garden.appendChild(dim);
    }
    if (_wxKind === 'rain') {
      const layer = document.createElement('div');
      layer.className = 'wx-layer';
      for (let i = 0; i < 28; i++) {
        const d = document.createElement('div');
        d.className = 'wx-drop';
        d.style.left = (Math.random() * 100) + '%';
        d.style.animationDuration = (0.6 + Math.random() * 0.7).toFixed(2) + 's';
        d.style.animationDelay = (Math.random() * 1.5).toFixed(2) + 's';
        d.style.opacity = (0.35 + Math.random() * 0.45).toFixed(2);
        layer.appendChild(d);
      }
      garden.appendChild(layer);
    }
  }
}
loadWeather();
setInterval(loadWeather, 15 * 60000);
