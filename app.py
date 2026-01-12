import os
import psycopg2
from flask import Flask, request, send_from_directory, jsonify
import telebot

# =======================
# SOZLAMALAR
# =======================

TOKEN = os.environ.get("BOT_TOKEN")
if not TOKEN:
    raise RuntimeError("BOT_TOKEN environment variable not set")

DOMAIN = os.environ.get("DOMAIN")
if not DOMAIN:
    raise RuntimeError("DOMAIN environment variable not set")

WEBHOOK_PATH = f"/{TOKEN}"
WEBHOOK_URL = DOMAIN + WEBHOOK_PATH

bot = telebot.TeleBot(TOKEN, threaded=False)
app = Flask(__name__, static_folder="webapp")

PORT = int(os.environ.get("PORT", 8080))
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable not set")

# =======================
# DATABASE FUNKSIYALARI
# =======================

def get_db_connection():
    print(f"ℹ️ Bazaga ulanishga urinish: {DATABASE_URL}")
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    print("✅ Baza bilan muvaffaqiyatli ulandik!")
    return conn

def init_db():
    conn = None
    cur = None
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
        print("✅ DB ready (Jadvallar yaratildi/tekshirildi)")
    except psycopg2.Error as e:
        print(f"❌ DB init error: {e}")
    finally:
        if cur: cur.close()
        if conn: conn.close()

# =======================
# TELEGRAM KLAWIATURA
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
# BOT HANDLERLARI
# =======================

@bot.message_handler(commands=["start"])
def start_handler(message):
    bot.send_message(
        message.chat.id,
        "🍅 Tomama botiga xush kelibsiz!\nQuyidagi menyudan foydalaning 👇",
        reply_markup=main_keyboard()
    )

@bot.message_handler(func=lambda m: m.text == "🔹 Korxona Haqida")
def about_handler(message):
    bot.send_message(
        message.chat.id,
        "📢 *Tomama haqida*\n\n2009-yildan buyon sifatli mahsulotlar.\n\n📧 Email: tomama-uz@mail.ru\n📞 Tel: +998905547400",
        parse_mode="Markdown"
    )

@bot.message_handler(func=lambda m: m.text == "📞 Aloqa")
def contact_handler(message):
    bot.send_message(
        message.chat.id,
        "📬 *Aloqa*\n\n📞 +998905547400\n🕘 09:00–18:00\n📅 Dushanba–Juma",
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
# TELEGRAM WEBHOOK
# =======================

@app.route(WEBHOOK_PATH, methods=["POST"])
def telegram_webhook():
    update = telebot.types.Update.de_json(request.data.decode("utf-8"))
    bot.process_new_updates([update])
    return "OK", 200

# =======================
# WEBAPP (O‘YIN) ROUTES
# =======================

@app.route("/game")
def game():
    return send_from_directory("webapp", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("webapp", path)

# =======================
# SCORE & TOP10 ENDPOINTS
# =======================

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
        top_users = [{"username": r[0], "photo_url": r[1], "score": r[2]} for r in rows]
        return jsonify(top_users)
    except psycopg2.Error as e:
        print(f"❌ /top10 error: {e}")
        return jsonify({"error": "DB error"}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

# =======================
# HEALTH CHECK + WEBHOOK SET
# =======================

@app.route("/")
def index():
    bot.remove_webhook()
    bot.set_webhook(url=WEBHOOK_URL)
    return "✅ Tomama bot is running", 200

# =======================
# START SERVER
# =======================

if __name__ == "__main__":
    print("ℹ️ Server ishga tushmoqda...")
    init_db()
    app.run(host="0.0.0.0", port=PORT)
