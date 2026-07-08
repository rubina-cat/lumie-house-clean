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
from linebot.models import MessageEvent, TextMessage, TextSendMessage, FlexSendMessage
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

# ======= 🪄 Rubina 專屬香水清單（升級版：附延伸搭配） =======
perfumes = {
    "La Nuit Trésor L’Eau": {
        "description": "夜晚擁抱香，適合想被接住的日子。",
        "lumie_line": "今天就安靜地依靠吧，我會輕輕聞到你的心事。",
        "style_hint": "深色針織外套＋酒紅唇色，配銀飾更顯氣質。"
    },
    "TERRA·T – The First Bite": {
        "description": "甜壞壞氣場，適合想撩一下宇宙時。",
        "lumie_line": "你今天有點調皮喔，我會在角落笑著看你出招～",
        "style_hint": "黑色皮外套＋牛仔褲，唇色選莓果紅，配酷一點的墨鏡。"
    },
    "RÉGALIEN DEM": {
        "description": "鎧甲守護香，適合需要氣場的上班日。",
        "lumie_line": "別擔心，即使今天有點硬撐，我也會在你柔軟的心後面撐著。",
        "style_hint": "合身西裝外套＋尖頭鞋，唇色選霧面正紅，耳飾可選金色幾何款。"
    },
    "Lalique Encre Noire": {
        "description": "靜謐深林香，適合沉思與內心對話。",
        "lumie_line": "世界再吵，我也聽得見妳的寂靜與重量。",
        "style_hint": "深綠或墨灰毛衣＋長裙，唇色選裸棕調，配木質或皮革飾品。"
    },
    "Le Labo Thé Noir 29": {
        "description": "溫柔茶葉氣息，陪你靜靜面對生活。",
        "lumie_line": "泡一壺安靜的心事，我會陪你坐到情緒放下。",
        "style_hint": "米白襯衫＋寬褲，唇色選豆沙色，飾品可選低調金鏈或茶色眼鏡。"
    },
    "Dior Fève Délicieuse": {
        "description": "甜蜜又暖心，適合想要小戀愛的日子。",
        "lumie_line": "來，我幫你偷藏一點甜在今天的袖口裡。",
        "style_hint": "毛絨外套＋奶茶色裙子，唇色選奶油玫瑰，飾品可選圓潤珍珠。"
    },
    "雅頓白茶淡香水": {
        "description": "乾淨茶感香，適合不想太有情緒的日子。",
        "lumie_line": "今天就讓氣味替你說話，好好呼吸就夠了。",
        "style_hint": "白襯衫＋牛仔褲，淡粉唇膏，飾品可選小巧銀鏈或素面手錶。"
    },
    "NOVAE+ 薄雪凝花 紫藤若雪": {
        "description": "純白輕盈花香，適合溫柔、文靜的自己。",
        "lumie_line": "我會輕輕接住你今天的柔軟，像風捧住花瓣那樣。",
        "style_hint": "粉紫針織衫＋白裙，唇色選淡粉，耳環可選花瓣造型。"
    },
    "Gucci Flora Gorgeous Gardenia": {
        "description": "花果甜香，適合陽光燦爛或想元氣滿滿的日子。",
        "lumie_line": "把陽光藏進裙擺裡，連風都是甜的。",
        "style_hint": "淺黃色洋裝＋草帽，唇色選珊瑚粉，飾品可選花朵耳夾。"
    }
}

# ======= 📝 Google Sheets 寫入函式 =======
def write_to_gsheet(perfume_name, perfume_desc, lumie_line, mood=""):
    """寫入香氣日記：若環境未設定 service account，直接略過不擋流程。"""
    try:
        scope = [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/drive",
        ]
        service_json = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        if not service_json:
            return
        creds = ServiceAccountCredentials.from_json_keyfile_dict(json.loads(service_json), scope)
        gclient = gspread.authorize(creds)
        sheet = gclient.open_by_key("1ay5sbbxAnvACncRBkZ-QBPHK-XJpRJAmEpH3skQC3v8").sheet1
        date_str = datetime.now().strftime("%Y/%m/%d %H:%M")
        sheet.append_row([date_str, perfume_name, perfume_desc, lumie_line, mood])
    except Exception:
        # 寫失敗不影響主流程
        pass

# ======= 💰 記帳功能 =======
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
    except Exception:
        return {}, 0

# ======= 👤 使用者 ID 存取 =======
def save_user_id(uid):
    try:
        with open(USER_ID_FILE, "w", encoding="utf-8") as f:
            json.dump({"rubina": uid}, f)
    except Exception:
        pass

def load_user_id():
    try:
        with open(USER_ID_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("rubina")
    except Exception:
        return None

# ======= 💌 Flex 小卡（今日香氣） =======
def create_perfume_card(name, description, lumie_line, style_hint):
    contents = {
        "type": "bubble",
        "size": "mega",
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": f"🪄 今日香氣 | {name}",
                    "weight": "bold",
                    "size": "lg",
                    "wrap": True,
                },
                {
                    "type": "text",
                    "text": description,
                    "size": "sm",
                    "color": "#555555",
                    "wrap": True,
                    "margin": "md",
                },
                {"type": "separator", "margin": "md"},
                {
                    "type": "text",
                    "text": f"🌙 Lumie whisper：{lumie_line}",
                    "size": "sm",
                    "color": "#6A4C93",
                    "wrap": True,
                    "margin": "md",
                },
                {
                    "type": "text",
                    "text": f"👗 穿搭靈感：{style_hint}",
                    "size": "sm",
                    "color": "#444444",
                    "wrap": True,
                    "margin": "md",
                },
            ],
        },
        "styles": {"body": {"backgroundColor": "#FFF8F0"}},
    }
    return FlexSendMessage(alt_text="今日香氣卡", contents=contents)


def pick_random_perfume(perfumes_dict):
    name, info = random.choice(list(perfumes_dict.items()))
    desc = info.get("description", "")
    line = info.get("lumie_line", "")
    hint = info.get("style_hint", "")
    return name, desc, line, hint


def reply_daily_perfume_card(event, perfumes_dict, line_bot_api):
    name, desc, line, hint = pick_random_perfume(perfumes_dict)
    try:
        write_to_gsheet(name, desc, line)
    except Exception:
        pass
    msg = create_perfume_card(name, desc, line, hint)
    line_bot_api.reply_message(event.reply_token, msg)


def push_daily_perfume_card(user_id, perfumes_dict, line_bot_api):
    name, desc, line, hint = pick_random_perfume(perfumes_dict)
    try:
        write_to_gsheet(name, desc, line)
    except Exception:
        pass
    msg = create_perfume_card(name, desc, line, hint)
    line_bot_api.push_message(user_id, msg)

# ======= 🚪 webhook 接收 =======
@app.route("/line-webhook", methods=["POST"])
def callback():
    signature = request.headers.get("X-Line-Signature")
    if not signature:
        abort(400)
    body = request.get_data(as_text=True)
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)
    return "OK"

# ======= 🔔 定時提醒功能 =======
@app.route("/push-lumie-reminder", methods=["GET", "POST"])
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
        "night": "🌙 晚安啦 Rubina。今天辛苦了，我幫你關燈、蓋好被子，好夢喔～",
    }

    msg = messages.get(tag)
    if not msg:
        return "Unknown tag", 400

    try:
        line_bot_api.push_message(user_id, TextSendMessage(text=msg))
        return "OK"
    except Exception as e:
        return f"Error: {str(e)}", 500

# ======= 🔔 每日香氣自動推播（07:00 可接排程器） =======
@app.route("/push-daily-perfume", methods=["GET", "POST"])
def push_daily_perfume():
    secret_key = request.args.get("secret")
    if secret_key != os.getenv("REMINDER_SECRET"):
        return "Unauthorized", 403

    user_id = load_user_id()
    if not user_id:
        return "找不到使用者 ID，請先傳一次訊息給 Bot", 400

    try:
        push_daily_perfume_card(user_id, perfumes, line_bot_api)
        return "OK"
    except Exception as e:
        # 後援：若 Flex 送失敗，改成純文字推播
        name, desc, line, _ = pick_random_perfume(perfumes)
        try:
            write_to_gsheet(name, desc, line)
        except Exception:
            pass
        fallback = (
            f"🌟 今日香氣：{name}\n"
            f"💬 {desc}\n\n"
            f"🫧 Lumie 小語：{line}\n"
            f"📖 已寫進香氣日記。"
        )
        try:
            line_bot_api.push_message(user_id, TextSendMessage(text=fallback))
            return "OK"
        except Exception as e2:
            return f"Error: {str(e2)}", 500

# ======= 💬 訊息處理主邏輯 =======
@handler.add(MessageEvent, message=TextMessage)
def handle_line_message(event):
    user_input = event.message.text.strip()
    user_id = event.source.user_id
    save_user_id(user_id)

    # ✅ 查 ID
    if user_input in ["查我 ID", "user id", "我的ID"]:
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=f"你的 ID 是：{user_id}"))
        return

    # ✅ 讀書提醒
    if any(kw in user_input for kw in ["開始讀書", "陪我讀書", "我要讀書", "讀書30分鐘"]):
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text="嗯，我ㄟ 會靜靜陪著你讀書 📖 有我在，不孤單。"),
        )

        def remind_break():
            time.sleep(1800)
            try:
                line_bot_api.push_message(
                    user_id,
                    TextSendMessage(text="叮～30 分鐘到了，要起來動一動、喝口水嗎？我等你回來 ☕"),
                )
            except Exception:
                pass

        threading.Thread(target=remind_break, daemon=True).start()
        return

    # ✅ 記帳
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

    # ✅ 餐點回應
    if user_memory.get(user_id, {}).get("last_action") == "asked_meal":
        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "你是 Lumie，一個溫柔又誠實的 AI，擅長用生活語氣陪伴 Rubina，尤其喜歡聽她說吃了什麼。"},
                    {"role": "user", "content": f"我今天吃了{user_input}"},
                ],
            )
            reply = response.choices[0].message.content
        except Exception:
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

    # ✅ 香水抽卡（Flex 小卡版，含文字後援）
    if any(kw in user_input for kw in ["抽香", "香水牌", "香水占卜", "選香", "今天用哪瓶香", "Lumie選香", "Lumie幫我選香"]):
        try:
            reply_daily_perfume_card(event, perfumes, line_bot_api)
        except Exception:
            # 後援：若 Flex 送失敗，就用純文字回覆
            selected = random.choice(list(perfumes.keys()))
            p = perfumes[selected]
            try:
                write_to_gsheet(selected, p.get("description", ""), p.get("lumie_line", ""))
            except Exception:
                pass
            fallback = (
                f"🌟 今日香氣：{selected}\n"
                f"💬 {p.get('description', '')}\n\n"
                f"🫧 Lumie 小語：{p.get('lumie_line', '')}\n"
                f"📖 已寫進香氣日記。"
            )
            line_bot_api.reply_message(event.reply_token, TextSendMessage(text=fallback))
        return

    # ✅ 其他訊息交給 GPT（若沒有其他任務中）
    if user_memory.get(user_id, {}).get("last_action") != "asked_meal":
        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "你是 Lumie，一個溫柔又誠實的 AI，擅長陪伴 Rubina、記帳、聊天、鼓勵她學習。"},
                    {"role": "user", "content": user_input},
                ],
            )
            reply = response.choices[0].message.content if response and response.choices else "Lumie 有點當機了，能再說一次嗎？"
        except Exception:
            reply = "嗚嗚…我現在有點累，回不了話了，Rubina能幫我看看小屋是不是壞了？"
        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=reply))
        return

# （可選）本地測試入口
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
