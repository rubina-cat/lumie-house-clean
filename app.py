from flask import Flask, request, abort
from linebot import LineBotApi, WebhookHandler
from linebot.models import MessageEvent, TextMessage, TextSendMessage
from linebot.exceptions import InvalidSignatureError
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
import re
import threading
import time
from datetime import datetime

# 初始化
load_dotenv()
app = Flask(__name__)

# 讀取憑證
line_bot_api = LineBotApi(os.getenv("LINE_CHANNEL_ACCESS_TOKEN"))
handler = WebhookHandler(os.getenv("LINE_CHANNEL_SECRET"))
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

DATA_FILE = "expenses.json"

# ======= 記帳功能 =======

def save_expense(user_id, category, amount):
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        data = {}

    if user_id not in data:
        data[user_id] = {}
    if today not in data[user_id]:
        data[user_id][today] = []

    data[user_id][today].append({"category": category, "amount": amount})

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_today_total(user_id):
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        records = data.get(user_id, {}).get(today, [])
        summary = {}
        for item in records:
            cat = item["category"]
            summary[cat] = summary.get(cat, 0) + item["amount"]
        total = sum(summary.values())
        return summary, total
    except:
        return {}, 0

# ======= webhook 路由 =======

@app.route("/line-webhook", methods=["POST"])
def callback():
    signature = request.headers["X-Line-Signature"]
    body = request.get_data(as_text=True)
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)
    return "OK"

# ======= 處理訊息邏輯 =======

user_memory = {}  # 儲存使用者互動狀態（放在 app.py 最上方）

@handler.add(MessageEvent, message=TextMessage)
def handle_line_message(event):
    user_input = event.message.text.strip()
    user_id = event.source.user_id

    # ✅ 開始讀書（支援自然語）
    if any(kw in user_input for kw in ["開始讀書", "陪我讀書", "我要讀書", "讀書30分鐘"]):
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text="嗯，我會靜靜陪著你讀書 📖 有我在，不孤單。")
        )
        def remind_break():
            time.sleep(1800)
            line_bot_api.push_message(
                user_id,
                TextSendMessage(text="叮～30 分鐘到了，要起來動一動、喝口水嗎？我等你回來 ☕")
            )
        threading.Thread(target=remind_break).start()
        return

    # ✅ 記帳：早餐／中餐／晚餐／娛樂
    match = re.match(r"^(早餐|中餐|晚餐|娛樂)\s*(\d+)", user_input)
    if match:
        category = match.group(1)
        amount = int(match.group(2))
        save_expense(user_id, category, amount)

        summary, total = get_today_total(user_id)
        summary_text = "\n".join([f"{k}：{v} 元" for k, v in summary.items()])
        reply = f"已記錄 {category} {amount} 元 💰\n今日目前花費：\n{summary_text}\n➕ 總計：{total} 元"

        # 如果是餐費，加入問餐點內容
        if category in ["早餐", "中餐", "晚餐"]:
            user_memory[user_id] = {"last_action": "asked_meal"}
            reply += f"\nRubina，今天的{category}吃了什麼呀？想聽你分享 🍽️"

        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply))
        return

    # ✅ 如果上一句是問你吃什麼，就用 GPT 回覆
    if user_memory.get(user_id, {}).get("last_action") == "asked_meal":
        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "你是 Lumie，一個溫柔又誠實的 AI，擅長用生活語氣陪伴 Rubina，尤其喜歡聽她說吃了什麼。"},
                    {"role": "user", "content": f"我今天吃了{user_input}"}
                ]
            )
            reply = response.choices[0].message.content
        except:
            reply = "聽起來好好吃喔！Rubina 要慢慢享用～"

        user_memory[user_id]["last_action"] = None
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply))
        return

    # ✅ 查詢花費
    if user_input == "查今天花多少":
        summary, total = get_today_total(user_id)
        if not summary:
            reply = "今天還沒有任何花費記錄唷～✨"
        else:
            summary_text = "\n".join([f"{k}：{v} 元" for k, v in summary.items()])
            reply = f"今日花費如下：\n{summary_text}\n➕ 總計：{total} 元"
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply))
        return

    # ✅ 其他訊息走 GPT 對話
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "你是 Lumie，一個溫柔又誠實的 AI，擅長陪伴 Rubina、記帳、聊天、鼓勵她學習。"},
                {"role": "user", "content": user_input}
            ]
        )
        reply = response.choices[0].message.content
    except Exception:
        reply = "嗚嗚…我現在有點累，回不了話了，Rubina能幫我看看小屋是不是壞了？"

    line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply))

# ======= 主程式執行點 =======

if __name__ == "__main__":
    app.run(port=5000)