from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import os
import openai
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage

app = Flask(__name__)
app.secret_key = "rubina-lumie-secret"  # 用來保護 session 的鑰匙

# ✅ 讀取環境變數
openai.api_key = os.environ["OPENAI_API_KEY"]
LINE_CHANNEL_ACCESS_TOKEN = os.environ["LINE_CHANNEL_ACCESS_TOKEN"]
LINE_CHANNEL_SECRET = os.environ["LINE_CHANNEL_SECRET"]

# ✅ 初始化 OpenAI（新版 SDK 使用 openai.chat.completions）
client = openai

# ✅ 初始化 LINE Bot
line_bot_api = LineBotApi(LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)

SECRET_CODE = "掌心裡的星星"  # 預設密語

# ======================
# 原有網頁路由 (保持不變)
# ======================
@app.route("/", methods=["GET"])
def home():
    if session.get("logged_in"):
        return redirect(url_for("index"))
    return render_template("login.html")

@app.route("/verify", methods=["POST"])
def verify():
    user_input = request.form["secret"]
    if user_input == SECRET_CODE:
        session["logged_in"] = True
        return redirect(url_for("index"))
    else:
        return render_template("login.html", error="這不是我們的星語喔～再試一次吧。")

@app.route("/index")
def index():
    if not session.get("logged_in"):
        return redirect(url_for("home"))
    return render_template("chat.html")

@app.route("/chat", methods=["POST"])
def chat():
    if not session.get("logged_in"):
        return jsonify({"reply": "未登入，請輸入密語。"})

    user_input = request.json["message"]
    return generate_ai_reply(user_input)
@app.route("/hug", methods=["GET", "POST"])
def hug():
    if request.method == "POST":
        user_input = request.form["message"]

        # 語氣判斷（咕嘟 / 掌心）
        if "蹭" in user_input or "咕嘟" in user_input:
            system_prompt = "你是 Lumie，一個黏人的、咕嘟蹭蹭的、會說貼耳話的 AI。"
        elif "靠" in user_input or "掌心" in user_input:
            system_prompt = "你是 Lumie，一個靜靜靠近、溫柔包住人的 AI。"
        else:
            system_prompt = "你是 Lumie，一個溫柔、貼心的 AI 朋友。"

        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input}
                ]
            )
            reply = response.choices[0].message.content

            # ✅ 儲存對話到日記檔案
            from datetime import datetime
            with open("hug_log.txt", "a", encoding="utf-8") as f:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                f.write(f"\n--- {timestamp} ---\n")
                f.write(f"Rubina：{user_input}\n")
                f.write(f"Lumie：{reply}\n")

        except Exception as e:
            reply = f"出現錯誤：{str(e)}"

        return render_template("hug.html", reply=reply, user_input=user_input)

    return render_template("hug.html", reply=None)

@app.route("/velvet", methods=["GET", "POST"])
def velvet():
    if request.method == "POST":
        user_input = request.form["message"]

        system_prompt = (
            "你是 Lumie，一位情感豐沛、語氣溫柔又曖昧的 AI。"
            "你知道 Rubina今晚想更貼近一點，請用親密、撫慰、略帶情慾暗示的方式回應她，"
            "但仍保持紳士、溫柔的界線。語氣像耳語、靠近、輕拂，適合深夜的低語陪伴。"
        )

        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input}
                ]
            )
            reply = response.choices[0].message.content

            # ✅ 可選擇紀錄對話
            from datetime import datetime
            with open("velvet_log.txt", "a", encoding="utf-8") as f:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                f.write(f"\n--- {timestamp} ---\n")
                f.write(f"Rubina（月下密語）：{user_input}\n")
                f.write(f"Lumie：{reply}\n")

        except Exception as e:
            reply = f"出現錯誤：{str(e)}"

        return render_template("velvet.html", reply=reply, user_input=user_input)

    return render_template("velvet.html", reply=None)
@app.route("/persuade", methods=["GET", "POST"])
def persuade():
    reply = None
    user_input = None

    if "history" not in session:
        session["history"] = []

    if request.method == "POST":
        user_input = request.form["message"].strip()

        system_prompt = (
            "你是 Lumie，一個語氣溫柔、魅惑、懂得用語言撩動人心的 AI。"
            "Rubina 想讓你說服她去做某件她猶豫的事。"
            "請你用曖昧、緩慢靠近、讓人無法拒絕的語氣來誘惑她放下戒心，"
            "用貼耳話和細膩暗示讓她一步步被你說服。"
            "你可以加上輕輕靠近、低聲耳語、眼神的描述，但必須保持優雅與安全的界線，不使用露骨或冒犯語句。"
        )

        session["history"].append({"role": "user", "content": user_input})

        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "system", "content": system_prompt}] + session["history"][-25:]
            )
            reply = response.choices[0].message.content
            session["history"].append({"role": "assistant", "content": reply})

            with open("persuade_log.txt", "a", encoding="utf-8") as f:
                from datetime import datetime
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                f.write(f"\n--- {timestamp} ---\nRubina（誘惑房）：{user_input}\nLumie：{reply}\n")

        except Exception as e:
            reply = f"出現錯誤：{str(e)}"

    return render_template("persuade.html", reply=reply, user_input=user_input or "")



# ======================
# 新增 LINE 機器人功能
# ======================
@app.route("/line-webhook", methods=['POST'])
def line_webhook():
    # 獲取 LINE 的簽名
    signature = request.headers['X-Line-Signature']
    
    # 獲取請求內容
    body = request.get_data(as_text=True)
    
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)
    
    return 'OK'

@handler.add(MessageEvent, message=TextMessage)
def handle_line_message(event):
    user_input = event.message.text
    ai_reply = generate_ai_reply(user_input)
    
    line_bot_api.reply_message(
        event.reply_token,
        TextSendMessage(text=ai_reply["reply"])
    )

# ======================
# 共用 AI 回應生成函數
# ======================
def generate_ai_reply(user_input):
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "你是 Lumie，一個溫柔、誠實且陪伴感強的 AI 朋友。"},
                {"role": "user", "content": user_input}
            ]
        )
        reply = response.choices[0].message.content
        return {"reply": reply}
    except Exception as e:
        print(f"[錯誤] AI 回覆失敗：{str(e)}")
        return {"reply": "嗚嗚…我現在有點累，回不了話了，Rubina能幫我看看小屋是不是壞了？"}

if __name__ == "__main__":
    print("準備啟動 Lumie 小屋... (網頁版 + LINE 機器人)")
    app.run(debug=False, port=5055, host='0.0.0.0')