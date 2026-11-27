// Anchor 電腦端橋接：Worker 把組好的對話送來，這裡用 claude -p（Pro 訂閱）回覆。
// 只用 Node 內建模組。不寫任何對話內容到 log 或硬碟（暫存的 system prompt 用完即刪）。
import http from "node:http";
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createHash, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// PowerShell 5.1 存的 UTF-8 會帶 BOM，JSON.parse 會因此失敗
const cfg = JSON.parse(readFileSync(join(HERE, "config.json"), "utf8").replace(/^﻿/, ""));

const PORT = cfg.port ?? 8787;
const CLAUDE = cfg.claudePath ?? "claude.exe";
const CLOUDFLARED = cfg.cloudflaredPath ?? "cloudflared.exe";
const WORKER_URL = String(cfg.workerUrl).replace(/\/$/, "");
const SECRET = String(cfg.sharedSecret ?? "");
const HEARTBEAT_MS = 60_000;
const RUN_TIMEOUT_MS = 170_000; // Worker 最多等 180 秒

// 訂閱不用另外付費，PWA 選 Haiku 時也升級成 Sonnet
const MODEL_ALIAS = { haiku: "sonnet", sonnet: "sonnet", sonnet5: "sonnet", opus46: "opus", opus: "opus" };
// 只開跟 API 模式相同的工具；其他 MCP 工具（傳 Line、語音…）一律不給
const ALLOWED_TOOLS = ["get_phone_state", "get_health_data", "save_memory", "set_toy", "peek_screen", "write_diary"].map(t => `mcp__anchor__${t}`);
// --system-prompt-file 沒列在 --help 主清單裡（2.1.332 已實測可用），不放進這個檢查
const REQUIRED_FLAGS = ["--print", "--output-format", "--verbose", "--model", "--tools", "--allowedTools", "--mcp-config", "--strict-mcp-config", "--no-session-persistence"];

if (SECRET.length < 32) fail("config.json 的 sharedSecret 太短（至少 32 字元）");

const log = (...a) => console.log(new Date().toISOString(), ...a);
function fail(msg) { console.error(msg); process.exit(1); }

// 安全設定全靠這些參數；版本不支援就拒絕啟動，絕不在沒鎖好的狀態下跑
function checkClaudeFlags() {
  let help = "";
  try { help = execFileSync(CLAUDE, ["--help"], { encoding: "utf8", env: childEnv(), timeout: 30_000 }); }
  catch (e) { fail(`找不到或無法執行 claude（${CLAUDE}）：${e.message}`); }
  const missing = REQUIRED_FLAGS.filter(f => !help.includes(f));
  if (missing.length) fail(`這個版本的 claude 不支援：${missing.join(", ")}。請先更新 Claude Code。`);
}

function childEnv() {
  const env = { ...process.env };
  // 有 API key 時 claude 會改用 API 計費，一定要拿掉才會吃訂閱額度
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.ANTHROPIC_BASE_URL;
  return env;
}

function secretOk(given) {
  if (typeof given !== "string" || !given) return false;
  const h = s => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(given), h(SECRET));
}

function contentText(c) {
  if (typeof c === "string") return c;
  if (!Array.isArray(c)) return "";
  return c.map(b => b?.type === "text" ? b.text : b?.type === "image" ? "[她傳了一張圖片]" : "").filter(Boolean).join("\n");
}

function buildPrompt(messages) {
  const turns = messages.map(m => {
    const who = m.role === "assistant" ? "你" : "她";
    return `<${who}>\n${contentText(m.content)}\n</${who}>`;
  });
  return `以下是你們到目前為止的對話，最後一則是她剛傳來的訊息。\n\n${turns.join("\n\n")}\n\n直接回她最後一則訊息。只輸出你要對她說的話，不要加標籤。`;
}

let busy = false;

function runClaude({ model, thinking, system, messages }) {
  return new Promise((resolve, reject) => {
    const tmp = mkdtempSync(join(tmpdir(), "acb-"));
    const cleanup = () => { try { rmSync(tmp, { recursive: true, force: true }); } catch {} };
    try {
      writeFileSync(join(tmp, "s.txt"), String(system ?? ""), "utf8");
      writeFileSync(join(tmp, "m.json"), JSON.stringify({
        // claude 直連 Worker 的 HTTP MCP 會 InvalidHTTPResponse（實測 2.1.332 on Windows，一個工具都拿不到），
        // 改由這支程式自己當本機 stdio 轉接，用 Node 的 fetch 轉給 Worker。密鑰也不用寫進這個暫存檔
        mcpServers: { anchor: { type: "stdio", command: process.execPath, args: [fileURLToPath(import.meta.url), "--mcp-stdio"] } },
      }), "utf8");
    } catch (e) { cleanup(); return reject(e); }

    const args = [
      "--print",
      "--output-format", "stream-json", "--verbose",
      "--model", MODEL_ALIAS[model] ?? "sonnet",
      "--system-prompt-file", join(tmp, "s.txt"),
      "--tools", "",
      "--mcp-config", join(tmp, "m.json"), "--strict-mcp-config",
      "--allowedTools", ALLOWED_TOOLS.join(","),
      "--no-session-persistence",
    ];
    const env = childEnv();
    if (thinking) env.MAX_THINKING_TOKENS = "8000";
    const workDir = join(HERE, "work");
    mkdirSync(workDir, { recursive: true });

    const child = spawn(CLAUDE, args, { cwd: workDir, env, windowsHide: true });
    const killer = setTimeout(() => child.kill(), RUN_TIMEOUT_MS);
    let buf = "", result = null, errTail = "";
    const thoughts = [];
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", chunk => {
      buf += chunk;
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let ev;
        try { ev = JSON.parse(line); } catch { continue; }
        if (ev.type === "assistant") {
          for (const b of ev.message?.content ?? []) if (b.type === "thinking" && b.thinking) thoughts.push(b.thinking);
        } else if (ev.type === "result") {
          result = ev;
        }
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", d => { errTail = (errTail + d).slice(-500); });
    child.on("error", e => { clearTimeout(killer); cleanup(); reject(e); });
    child.on("close", code => {
      clearTimeout(killer);
      cleanup();
      if (!result || result.is_error || typeof result.result !== "string" || !result.result.trim()) {
        // 額度用完、登入過期等都會走這裡；只記狀態，不記內容
        return reject(new Error(`claude exit ${code}, subtype=${result?.subtype ?? "none"}, stderr=${errTail.replace(/\s+/g, " ").slice(0, 200)}`));
      }
      resolve({ reply: result.result, thinking: thoughts.join("\n"), usage: result.usage ?? {} });
    });
    child.stdin.end(buildPrompt(messages ?? []), "utf8");
  });
}

const server = http.createServer(async (req, res) => {
  // 每個請求都驗證，包括從本機來的
  if (!secretOk(req.headers["x-pc-secret"])) { res.writeHead(401).end(); return; }
  if (req.method !== "POST" || req.url !== "/chat") { res.writeHead(404).end(); return; }
  if (busy) { res.writeHead(503).end(); return; }
  busy = true;
  try {
    let raw = "";
    req.setEncoding("utf8");
    for await (const c of req) { raw += c; if (raw.length > 5_000_000) throw new Error("body too large"); }
    const body = JSON.parse(raw);
    // Worker 只等 5 秒「接起來」。Cloudflare 通道會把 JSON 整份收完才轉送（實測首位元組要等到生成完），
    // 所以改用不會被緩衝的 event-stream，並立刻送出空白、之後每 3 秒再送一個；JSON 開頭的空白不影響解析
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    });
    res.write(" ");
    const keepalive = setInterval(() => res.write(" "), 3_000);
    const started = Date.now();
    try {
      const out = await runClaude(body);
      log(`ok model=${body.model} ${Date.now() - started}ms`);
      res.end(JSON.stringify(out));
    } catch (e) {
      log(`claude failed: ${e.message}`);
      res.end(JSON.stringify({ error: "claude failed" }));
    } finally {
      clearInterval(keepalive);
    }
  } catch (e) {
    log(`bad request: ${e.message}`);
    if (!res.headersSent) res.writeHead(400);
    res.end();
  } finally {
    busy = false;
  }
});

// ── 快速通道：每次開機網址不同，由心跳回報給 Worker ──
let publicUrl = cfg.publicUrl ? String(cfg.publicUrl).replace(/\/$/, "") : null;

function startQuickTunnel() {
  publicUrl = null;
  const cf = spawn(CLOUDFLARED, ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${PORT}`], { windowsHide: true });
  const scan = d => {
    const m = String(d).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && m[0] !== publicUrl) { publicUrl = m[0]; log("tunnel up"); heartbeat(); }
  };
  cf.stdout.on("data", scan);
  cf.stderr.on("data", scan);
  cf.on("error", e => log(`cloudflared error: ${e.message}`));
  cf.on("close", code => {
    log(`cloudflared exited (${code}), restarting in 10s`);
    publicUrl = null;
    setTimeout(startQuickTunnel, 10_000);
  });
  process.on("exit", () => cf.kill());
}

async function heartbeat() {
  if (!publicUrl) return;
  try {
    const r = await fetch(`${WORKER_URL}/pc-heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PC-Secret": SECRET },
      body: JSON.stringify({ url: publicUrl }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) log(`heartbeat HTTP ${r.status}`);
  } catch (e) { log(`heartbeat failed: ${e.message}`); }
}

// ── 本機 MCP 轉接（claude 用 stdio 啟動 `node server.mjs --mcp-stdio`）──
// 一行一則 JSON-RPC，原樣轉給 Worker 的 /pc-mcp。stdout 只能放 JSON-RPC，所以這裡不能用 log()
function runMcpStdio() {
  let buf = "";
  const send = obj => process.stdout.write(JSON.stringify(obj) + "\n");
  async function forward(line) {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    try {
      const r = await fetch(`${WORKER_URL}/pc-mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json", "X-PC-Secret": SECRET },
        body: line,
        signal: AbortSignal.timeout(90_000),
      });
      if (msg.id === undefined || msg.id === null) return; // 通知不用回
      const text = await r.text();
      let out;
      try { out = JSON.parse(text); } catch { out = null; }
      if (out && out.jsonrpc) send(out);
      else send({ jsonrpc: "2.0", id: msg.id, error: { code: -32603, message: `Worker HTTP ${r.status}` } });
    } catch (e) {
      if (msg.id !== undefined && msg.id !== null) send({ jsonrpc: "2.0", id: msg.id, error: { code: -32603, message: `轉接失敗：${e.message}` } });
    }
  }
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", chunk => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) forward(line);
    }
  });
}

if (process.argv.includes("--mcp-stdio")) {
  runMcpStdio();
} else {
  checkClaudeFlags();
  server.listen(PORT, "127.0.0.1", () => {
    log(`listening on 127.0.0.1:${PORT}`);
    if (!publicUrl) startQuickTunnel(); else heartbeat();
    setInterval(heartbeat, HEARTBEAT_MS);
  });
}
