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
  if (tabId === 'study') loadStudy();
  if (tabId === 'period') loadPeriod();
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
  fetchQuote();
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

  // 從通知點進來時自動播語音
  const autoplay = new URLSearchParams(location.search).get('autoplay');
  if (autoplay) {
    new Audio(decodeURIComponent(autoplay)).play().catch(() => {});
    history.replaceState({}, '', '/chat-ui.html');
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
  try {
    const r = await fetch(BASE + '/period-history');
    const d = await r.json();
    const list = document.getElementById('periodHistoryList');
    if (!list) return;
    const history = d.history || [];
    if (!history.length) { list.innerHTML = '<div class="period-history-empty">還沒有歷史記錄</div>'; return; }
    list.innerHTML = history.slice().reverse().map(h => `
      <div class="period-history-item">
        <div class="period-history-dates">${h.cycle_start} → ${h.period_end || '進行中'}</div>
        <div class="period-history-meta">經期 ${h.period_length ?? '?'} 天・週期 ${h.cycle_length ?? '?'} 天</div>
      </div>`).join('');
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
