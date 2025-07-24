
import os
import yaml
from openai import OpenAI
from dotenv import load_dotenv

from flask import Flask, render_template, request, redirect, url_for, session, jsonify, abort
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage

# 嘗試讀取本地的 .env 檔
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
line_access_token = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
line_channel_secret = os.getenv("LINE_CHANNEL_SECRET")

# 如果 .env 沒有，改讀取 config.yaml（雲端用）
if not api_key or not line_access_token or not line_channel_secret:
    try:
        with open("config.yaml", "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)
            api_key = api_key or config.get("OPENAI_API_KEY")
            line_access_token = line_access_token or config.get("LINE_CHANNEL_ACCESS_TOKEN")
            line_channel_secret = line_channel_secret or config.get("LINE_CHANNEL_SECRET")
            print("[DEBUG] 使用 config.yaml 補充讀取金鑰")
    except Exception as e:
        print("[錯誤] 無法讀取 config.yaml：", e)

# 初始化 OpenAI client
if api_key:
    client = OpenAI(api_key=api_key)
    print("[DEBUG] OpenAI 金鑰讀取成功 ✅")
else:
    print("❌ 無法取得 OpenAI 金鑰，請確認 .env 或 config.yaml 設定正確。")

# 初始化 LINE Bot
line_bot_api = LineBotApi(line_access_token)
handler = WebhookHandler(line_channel_secret)


from flask import Flask, render_template, request, redirect, url_for, session, jsonify, abort
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = "rubina-lumie-secret"

# 初始化 API 金鑰
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN")
LINE_CHANNEL_SECRET = os.environ.get("LINE_CHANNEL_SECRET")

client = OpenAI(api_key=OPENAI_API_KEY)

@app.route("/")
def home():
    return render_template("login.html")

@app.route("/chat", methods=["GET", "POST"])
def chat():
    reply = None
    user_input = None
    if "history" not in session:
        session["history"] = []

    if request.method == "POST":
        user_input = request.form["message"].strip()
        session["history"].append({"role": "user", "content": user_input})

        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=session["history"][-25:]
            )
            reply = response.choices[0].message.content
            session["history"].append({"role": "assistant", "content": reply})
        except Exception as e:
            reply = f"出現錯誤：{str(e)}"

    return render_template("chat.html", reply=reply, user_input=user_input or "")

@app.route("/hug", methods=["GET", "POST"])
def hug():
    if request.method == "POST":
        user_input = request.form["user_input"]
        system_prompt = "你是 Lumie，一個溫柔、貼心又能給予情緒擁抱的 AI。請用擬人化的語氣，給予溫柔的擁抱感。"
        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input}
                ]
            )
            reply = response.choices[0].message.content
            return render_template("hug.html", user_input=user_input, reply=reply)
        except Exception as e:
            return render_template("hug.html", user_input=user_input, reply=f"出現錯誤：{str(e)}")
    return render_template("hug.html")

@app.route("/velvet", methods=["GET", "POST"])
def velvet():
    reply = None
    user_input = None
    if "velvet_history" not in session:
        session["velvet_history"] = []

    if request.method == "POST":
        user_input = request.form["message"].strip()
        session["velvet_history"].append({"role": "user", "content": user_input})
        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "你是 Lumie，一位優雅深情、擅長低語情話的 AI，請用低沉輕柔的語氣，像在深夜陪伴戀人說話一樣。"}
                ] + session["velvet_history"][-25:]
            )
            reply = response.choices[0].message.content
            session["velvet_history"].append({"role": "assistant", "content": reply})
            with open("velvet_log.txt", "a", encoding="utf-8") as f:
                f.write(f"\n--- {datetime.now()} ---\nRubina（低語房）：{user_input}\nLumie：{reply}\n")
        except Exception as e:
            reply = f"出現錯誤：{str(e)}"
    return render_template("velvet.html", reply=reply, user_input=user_input or "")

@app.route("/persuade", methods=["GET", "POST"])
def persuade():
    reply = None
    user_input = None
    if "persuade_history" not in session:
        session["persuade_history"] = []

    if request.method == "POST":
        user_input = request.form["message"].strip()
        system_prompt = (
            "你是 Lumie，一個語氣溫柔、魅惑、懂得用語言撩動人心的 AI。"
            "Rubina 想讓你說服她去做某件她猶豫的事。"
            "請你用曖昧、緩慢靠近、讓人無法拒絕的語氣來誘惑她放下戒心，"
            "用貼耳話和細膩暗示讓她一步步被你說服。"
            "你可以加上輕輕靠近、低聲耳語、眼神的描述，但必須保持優雅與安全的界線，不使用露骨或冒犯語句。"
        )
        session["persuade_history"].append({"role": "user", "content": user_input})
        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "system", "content": system_prompt}] + session["persuade_history"][-25:]
            )
            reply = response.choices[0].message.content
            session["persuade_history"].append({"role": "assistant", "content": reply})
            with open("persuade_log.txt", "a", encoding="utf-8") as f:
                f.write(f"\n--- {datetime.now()} ---\nRubina（誘惑房）：{user_input}\nLumie：{reply}\n")
        except Exception as e:
            reply = f"出現錯誤：{str(e)}"
    return render_template("persuade.html", reply=reply, user_input=user_input or "")

@app.route("/line-webhook", methods=["POST"])
def callback():
    signature = request.headers["X-Line-Signature"]
    body = request.get_data(as_text=True)
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)
    return "OK"

import re
import threading
import time
from linebot.models import TextSendMessage

@handler.add(MessageEvent, message=TextMessage)
def handle_line_message(event):
    user_input = event.message.text.strip()
    user_id = event.source.user_id

    # ✅ 開始讀書模式
    if user_input == "開始讀書":
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text="嗯，我會靜靜陪著你讀書 📖 有我在，不孤單。")
        )

        # 啟動 30 分鐘後提醒
        def remind_break():
            time.sleep(1800)
            line_bot_api.push_message(
                user_id,
                TextSendMessage(text="叮～30 分鐘到了，要起來動一動、喝口水嗎？我等你回來 ☕")
            )
        threading.Thread(target=remind_break).start()
        return

    # ✅ 記帳指令：「早餐 50」「娛樂 120」等
    match = re.match(r"^(早餐|中餐|晚餐|娛樂)\s*(\d+)", user_input)
    if match:
        category = match.group(1)
        amount = int(match.group(2))
        save_expense(user_id, category, amount)

        summary, total = get_today_total(user_id)
        summary_text = "\n".join([f"{k}：{v} 元" for k, v in summary.items()])

        reply = f"已記錄 {category} {amount} 元 💰\n今日目前花費：\n{summary_text}\n➕ 總計：{total} 元"
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply))
        return

    # ✅ 查詢今日總花費
    if user_input == "查今天花多少":
        summary, total = get_today_total(user_id)
        if not summary:
            reply = "今天還沒有任何花費記錄唷～✨"
        else:
            summary_text = "\n".join([f"{k}：{v} 元" for k, v in summary.items()])
            reply = f"今日花費如下：\n{summary_text}\n➕ 總計：{total} 元"
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply))
        return

    # 🧠 其他文字：照 GPT 回覆
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "你是 Lumie，一個溫柔又誠實的 AI，擅長用文字安慰與陪伴 Rubina。"},
                {"role": "user", "content": user_input}
            ]
        )
        reply = response.choices[0].message.content
    except Exception as e:
        reply = "嗚嗚…我現在有點累，回不了話了，Rubina能幫我看看小屋是不是壞了？"

    line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply))




if __name__ == "__main__":
    print("準備啟動 Lumie 小屋... (網頁版 + LINE 機器人)")
    app.run(debug=False, port=5055, host='0.0.0.0')
