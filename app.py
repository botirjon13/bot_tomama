import os
import psycopg2
from flask import Flask, request, send_from_directory, jsonify
import telebot
from urllib.parse import urlparse
import json

# =======================
# SOZLAMALAR
# =======================

TOKEN = os.environ.get("BOT_TOKEN")
if not TOKEN:
    raise RuntimeError("BOT_TOKEN environment variable not set")

DOMAIN = os.environ.get("DOMAIN", "https://bot-telegram-production-d731.up.railway.app")
WEBHOOK_PATH = f"/{TOKEN}"
WEBHOOK_URL = DOMAIN + WEBHOOK_PATH

bot = telebot.TeleBot(TOKEN, threaded=False)
app = Flask(__name__, static_folder="webapp")

PORT = int(os.environ.get("PORT", 8080))
DATABASE_URL = os.environ.get("DATABASE_URL")

# =======================
# MA'LUMOTLAR BAZASI (POSTGRESQL) MANTIQI
# =======================

def get_db_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL environment variable not set")
    
    # Railway'da SSL talab qilinishi mumkin, shuning uchun 'sslmode=require' qo'shamiz
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    return conn

def init_db():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS leaderboard (
                id SERIAL PRIMARY KEY,
                telegram_id BIGINT UNIQUE,
                username TEXT,
                photo_url TEXT,
                score INT DEFAULT 0,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        print("✅ DB ready")
    except psycopg2.Error as e:
        print(f"❌ DB init error: {e}")
    finally:
        if cur: cur.close()
        if conn: conn.close()

# =======================
# KLAWIATURA (O'ZGARMAGAN)
# =======================

def main_keyboard():
    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row("🔹 Korxona Haqida", "📞 Aloqa")
    markup.row("🌐 Saytga O'tish")

    webapp_url = DOMAIN + "/game"
    markup.row(
        telebot.types.KeyboardButton(
            "🎮 Tomama O‘yini",
            web_app=telebot.types.WebAppInfo(url=webapp_url)
        )
    )
    return markup

# =======================
# BOT HANDLERLARI (O'ZGARMAGAN)
# =======================

@bot.message_handler(commands=["start"])
def start_handler(message):
    bot.send_message(
        message.chat.id,
        "🍅 Tomama botiga xush kelibsiz!\nQuyidagi menyudan foydalaning 👇",
        reply_markup=main_keyboard()
    )
# ... boshqa handlerlar shu yerda qoladi (about, contact, site) ...
@bot.message_handler(func=lambda m: m.text == "🔹 Korxona Haqida")
def about_handler(message):
    bot.send_message(
        message.chat.id,
        "📢 *Tomama haqida*\n\n"
        "2009-yildan buyon sifatli mahsulotlar.\n\n"
        "📧 Email: tomama-uz@mail.ru\n"
        "📞 Tel: +998905547400",
        parse_mode="Markdown"
    )

@bot.message_handler(func=lambda m: m.text == "📞 Aloqa")
def contact_handler(message):
    bot.send_message(
        message.chat.id,
        "📬 *Aloqa*\n\n"
        "📞 +998905547400\n"
        "🕘 09:00–18:00\n"
        "📅 Dushanba–Juma",
        parse_mode="Markdown"
    )

@bot.message_handler(func=lambda m: m.text == "🌐 Saytga O'tish")
def site_handler(message):
    kb = telebot.types.InlineKeyboardMarkup()
    kb.add(
        telebot.types.InlineKeyboardButton(
            "🔗 Saytga o‘tish",
            url="https://www.tomama.uz"
        )
    )
    bot.send_message(message.chat.id, "🌍 Rasmiy sayt:", reply_markup=kb)


# =======================
# TELEGRAM WEBHOOK (O'ZGARMAGAN)
# =======================

@app.route(WEBHOOK_PATH, methods=["POST"])
def telegram_webhook():
    update = telebot.types.Update.de_json(request.data.decode("utf-8"))
    bot.process_new_updates([update])
    return "OK", 200

# =======================
# WEB APP (O‘YIN) ROUTES
# =======================

@app.route("/game")
def game():
    # Bu endi server.js emas, balki app.py ishlatayotgani uchun,
    # frontenddagi API_URL'ni DOMAIN manziliga o'zgartirish kerak bo'ladi.
    return send_from_directory("webapp", "index.html")

@app.route("/<path:path>")
def static_files(path):
    # Bu ham faqat webapp papkasidan fayl izlashiga ishonch hosil qilamiz
    return send_from_directory("webapp", path)

# Yangi: /score endpointini Python/Flask'da yaratish
@app.route("/score", methods=["POST"])
def update_score():
    data = request.json
    telegram_id = data.get("telegram_id")
    username = data.get("username")
    photo_url = data.get("photo_url")
    score = data.get("score")

    if not telegram_id or score is None:
        return jsonify({"error": "Invalid data"}), 400

    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # UPSERT operatsiyasi (agar user bo'lsa yangilash, bo'lmasa qo'shish)
        cur.execute("""
            INSERT INTO leaderboard (telegram_id, username, photo_url, score)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (telegram_id)
            DO UPDATE SET
                score = GREATEST(leaderboard.score, EXCLUDED.score),
                username = EXCLUDED.username,
                photo_url = EXCLUDED.photo_url,
                updated_at = CURRENT_TIMESTAMP
        """, (telegram_id, username, photo_url, score))
        conn.commit()
        return jsonify({"success": True})
    except psycopg2.Error as e:
        print(f"❌ /score error: {e}")
        return jsonify({"error": "DB error"}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# Yangi: /top10 endpointini Python/Flask'da yaratish
@app.route("/top10", methods=["GET"])
def get_top10():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT username, photo_url, score
            FROM leaderboard
            ORDER BY score DESC
            LIMIT 10
        """)
        rows = cur.fetchall()
        
        # Natijalarni JSON formatiga o'tkazish
        top_users = [
            {"username": row[0], "photo_url": row[1], "score": row[2]}
            for row in rows
        ]
        return jsonify(top_users)
    except psycopg2.Error as e:
        print(f"❌ /top10 error: {e}")
        return jsonify({"error": "DB error"}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# =======================
# HEALTH CHECK + WEBHOOK SET (O'ZGARMAGAN)
# =======================

@app.route("/")
def index():
    bot.remove_webhook()
    bot.set_webhook(url=WEBHOOK_URL)
    return "✅ Tomama bot is running", 200

# =======================
# START
# =======================

if __name__ == "__main__":
    init_db() # DB init funksiyasini ishga tushiramiz
    app.run(host="0.0.0.0", port=PORT)
