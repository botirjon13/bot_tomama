import os
import psycopg2
from flask import Flask, request, send_from_directory, jsonify
import telebot
import time

# =======================
# SOZLAMALAR
# =======================
BOT_TOKEN = os.environ.get("BOT_TOKEN")
if not BOT_TOKEN:
    raise RuntimeError("❌ BOT_TOKEN environment variable not set")

DOMAIN = os.environ.get("DOMAIN") or "https://bot-telegram-production-d731.up.railway.app"
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("❌ DATABASE_URL environment variable not set")

WEBHOOK_PATH = f"/{BOT_TOKEN}"
WEBHOOK_URL = DOMAIN + WEBHOOK_PATH

bot = telebot.TeleBot(BOT_TOKEN, threaded=False)
app = Flask(__name__, static_folder="webapp")

PORT = int(os.environ.get("PORT", 8080))

# =======================
# MA'LUMOTLAR BAZASI
# =======================
def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    return conn

def init_db():
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
        print("✅ DB ready: leaderboard jadvali yaratildi/tekshirildi")
    except Exception as e:
        print(f"❌ DB init error: {e}")
    finally:
        if cur: cur.close()
        if conn: conn.close()

# =======================
# TELEGRAM WEBHOOK
# =======================
@app.route(WEBHOOK_PATH, methods=["POST"])
def telegram_webhook():
    update = telebot.types.Update.de_json(request.data.decode("utf-8"))
    bot.process_new_updates([update])
    return "OK", 200

# =======================
# WEB APP ROUTES
# =======================
@app.route("/game")
def game():
    return send_from_directory("webapp", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("webapp", path)

# =======================
# /score va /top10 endpointlari
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
    except Exception as e:
        print(f"❌ /score error: {e}")
        return jsonify({"error": "DB error"}), 500
    finally:
        if cur: cur.close()
        if conn: conn.close()

@app.route("/top10", methods=["GET"])
def get_top10():
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
    except Exception as e:
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
# START
# =======================
if __name__ == "__main__":
    print("ℹ️ Server ishga tushmoqda...")
    time.sleep(3)  # ba'zi serverlarda kechikish foydali
    init_db()
    app.run(host="0.0.0.0", port=PORT)
