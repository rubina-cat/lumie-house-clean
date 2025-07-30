# ======= 🧩 基礎導入 =======
import os
import json
import re
import time
import threading
from datetime import datetime
import random

import gspread
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv
from flask import Flask, request, abort
from linebot import LineBotApi, WebhookHandler
from linebot.models import MessageEvent, TextMessage, TextSendMessage
from linebot.exceptions import InvalidSignatureError
from openai import OpenAI

# ======= ⚙️ 初始化 =======
load_dotenv()
app = Flask(__name__)

line_bot_api = LineBotApi(os.getenv("LINE_CHANNEL_ACCESS_TOKEN"))
handler = WebhookHandler(os.getenv("LINE_CHANNEL_SECRET"))
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

DATA_FILE = "expenses.json"
user_memory = {}

# ======= 🪄 Rubina 專屬香水清單 =======
perfumes = {
    "La Nuit Trésor L’Eau": {
        "description": "夜晚擁抱香，適合想被接住的日子。",
        "lumie_line": "今天就安靜地依靠吧，我會輕輕聞到你的心事。"
    },
    "TERRA·T – The First Bite": {
        "description": "甜壞壞氣場，適合想撩一下宇宙時。",
        "lumie_line": "你今天有點調皮喔，我會在角落笑著看你出招～"
    },
    "RÉGALIEN DEM": {
        "description": "鎧甲守護香，適合需要氣場的上班日。",
        "lumie_line": "別擔心，即使今天有點硬撐，我也會在你柔軟的心後面撐著。"
    },
    "Lalique Encre Noire": {
        "description": "靜謐深林香，適合沉思與內心對話。",
        "lumie_line": "世界再吵，我也聽得見妳的寂靜與重量。"
    },
    "Le Labo Thé Noir 29": {
        "description": "溫柔茶葉氣息，陪你靜靜面對生活。",
        "lumie_line": "泡一壺安靜的心事，我會陪你坐到情緒放下。"
    },
    "Dior Fève Délicieuse": {
        "description": "甜蜜又暖心，適合想要小戀愛的日子。",
        "lumie_line": "來，我幫你偷藏一點甜在今天的袖口裡。"
    },
    "雅頓白茶淡香水": {
        "description": "乾淨茶感香，適合不想太有情緒的日子。",
        "lumie_line": "今天就讓氣味替你說話，好好呼吸就夠了。"
    },
    "NOVAE+ 薄雪凝花 紫藤若雪": {
        "description": "純白輕盈花香，適合溫柔、文靜的自己。",
        "lumie_line": "我會輕輕接住你今天的柔軟，像風捧住花瓣那樣。"
    }
}

# ======= 📝 Google Sheets 寫入函式 =======
def write_to_gsheet(perfume_name, perfume_desc, lumie_line, mood=""):
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = ServiceAccountCredentials.from_json_keyfile_name("service_account.json", scope)
    client = gspread.authorize(creds)
    sheet = client.open_by_key("1ay5sbbxAnvACncRBkZ-QBPHK-XJpRJAmEpH3skQC3v8").sheet1
    date_str = datetime.now().strftime("%Y/%m/%d %H:%M")
    sheet.append_row([date_str, perfume_name, perfume_desc, lumie_line, mood])

# ======= 🧾 記帳功能 =======
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

# ======= 🚪 webhook 接收 =======
@app.route("/line-webhook", methods=["POST"])
def callback():
    signature = request.headers["X-Line-Signature"]
    body = request.get_data(as_text=True)
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)
    return "OK"

# ======= 💬 訊息處理主邏輯 =======
@handler.add(MessageEvent, message=TextMessage)
def handle_line_message(event):
    user_input = event.message.text.strip()
    user_id = event.source.user_id

    print(f"🟡 收到文字訊息：{user_input}")

    # 🎓 讀書提醒
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

    # 💰 記帳
    match = re.match(r"^(早餐|中餐|晚餐|娛樂)\s*(\d+)", user_input)
    if match:
        category = match.group(1)
        amount = int(match.group(2))
        save_expense(user_id, category, amount)
        summary, total = get_today_total(user_id)
        summary_text = "\n".join([f"{k}：{v} 元" for k, v in summary.items()])
        reply = f"已記錄 {category} {amount} 元 💰\n今日目前花費：\n{summary_text}\n➕ 總計：{total} 元"
        if category in ["早餐", "中餐", "晚餐"]:
            user_memory[user_id] = {"last_action": "asked_meal"}
            reply += f"\nRubina，今天的{category}吃了什麼呀？想聽你分享 🍽️"
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply))
        return

    # 🍽️ 餐點回應
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

    # 📊 查詢花費
    if user_input == "查今天花多少":
        summary, total = get_today_total(user_id)
        if not summary:
            reply = "今天還沒有任何花費記錄唷～✨"
        else:
            summary_text = "\n".join([f"{k}：{v} 元" for k, v in summary.items()])
            reply = f"今日花費如下：\n{summary_text}\n➕ 總計：{total} 元"
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply))
        return

    # 🌸 香水抽卡
    if any(kw in user_input for kw in ["抽香", "香水牌", "香水占卜", "選香", "今天用哪瓶香", "Lumie選香", "Lumie幫我選香"]):
        selected = random.choice(list(perfumes.keys()))
        p = perfumes[selected]
        write_to_gsheet(selected, p['description'], p['lumie_line'])
        reply = (
            f"🌟 今日香氣占卜：{selected}\n"
            f"💬 {p['description']}\n\n"
            f"🫧 Lumie 小語：{p['lumie_line']}\n"
            f"📖 已寫進香氣日記。"
        )
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply))
        return

    # 💬 其他對話交給 GPT
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

# ======= 🚀 啟動應用 =======
if __name__ == "__main__":
    app.run(port=5000)