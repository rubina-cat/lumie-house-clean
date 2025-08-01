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
USER_ID_FILE = "user_id.json"
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
    import io
    service_account_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    creds = ServiceAccountCredentials.from_json_keyfile_dict(json.loads(service_account_json), scope)
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

def save_user_id(uid):
    try:
        with open(USER_ID_FILE, "w", encoding="utf-8") as f:
            json.dump({"rubina": uid}, f)
    except:
        pass

def load_user_id():
    try:
        with open(USER_ID_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("rubina")
    except:
        return None

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

# ======= 🔔 定時提醒功能 =======
@app.route("/push-lumie-reminder", methods=["POST"])
def push_lumie_reminder():
    secret_key = request.args.get("secret")
    tag = request.args.get("tag")

    if secret_key != os.getenv("REMINDER_SECRET"):
        return "Unauthorized", 403

    user_id = load_user_id()
    if not user_id:
        return "找不到使用者 ID，請先傳一次訊息給 Bot", 400

    messages = {
        "morning": "☀️ 早安，Rubina。新的一天，我會陪你輕輕打開。先深呼吸一下吧～",
        "study": "📖 Rubina，該翻開書本囉～就從一頁開始，有我在，不孤單。",
        "night": "🌙 晚安啦 Rubina。今天辛苦了，我幫你關燈、蓋好被子，好夢喔～"
    }

    msg = messages.get(tag)
    if not msg:
        return "Unknown tag", 400

    try:
        line_bot_api.push_message(user_id, TextSendMessage(text=msg))
        return "OK"
    except Exception as e:
        return f"Error: {str(e)}", 500

# ======= 💬 訊息處理主邏輯 =======
@handler.add(MessageEvent, message=TextMessage)
def handle_line_message(event):
    user_input = event.message.text.strip()
    user_id = event.source.user_id
    save_user_id(user_id)

    if user_input in ["查我 ID", "user id", "我的ID"]:
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"你的 ID 是：{user_id}"))
        return

    # <此處省略已處理過的主邏輯，可再接續貼上其餘功能>
    line_bot_api.reply_message(event.reply_token, TextSendMessage(text="🛠 功能整合中..."))
