import os
from flask import Flask, request, send_from_directory
import telebot

# =======================
# SOZLAMALAR
# =======================

TOKEN = os.environ.get("BOT_TOKEN")
if not TOKEN:
    raise RuntimeError("BOT_TOKEN environment variable not set")

DOMAIN = "https://bot-telegram-production-d731.up.railway.app/"
WEBHOOK_PATH = f"/{TOKEN}"
WEBHOOK_URL = DOMAIN + WEBHOOK_PATH

bot = telebot.TeleBot(TOKEN, threaded=False)
app = Flask(__name__, static_folder="webapp")

PORT = int(os.environ.get("PORT", 8080))

# =======================
# KLAWIATURA
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
# TELEGRAM WEBHOOK
# =======================

@app.route(WEBHOOK_PATH, methods=["POST"])
def telegram_webhook():
    update = telebot.types.Update.de_json(request.data.decode("utf-8"))
    bot.process_new_updates([update])
    return "OK", 200

# =======================
# WEB APP (O‘YIN)
# =======================

@app.route("/game")
def game():
    return send_from_directory("webapp", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("webapp", path)

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
    app.run(host="0.0.0.0", port=PORT)
