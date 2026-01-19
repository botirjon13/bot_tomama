import os
from flask import Flask, request, send_from_directory
import telebot

# =======================
# SOZLAMALAR
# =======================

TOKEN = os.environ.get("BOT_TOKEN")
if not TOKEN:
    raise RuntimeError("BOT_TOKEN environment variable not set")

DOMAIN = "https://bot-telegram-production-d731.up.railway.app"
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
    markup.row("🏢 Korxona haqida", "📞 Aloqa")
    markup.row("🌐 Rasmiy sayt")
    return markup

# =======================
# BOT HANDLERLARI
# =======================

@bot.message_handler(commands=["start"])
def start_handler(message):
    bot.send_message(
        message.chat.id,
        "🍅 *Tomama* rasmiy botiga xush kelibsiz!\n\n"
        "Quyidagi menyu orqali kerakli bo‘limni tanlang:",
        reply_markup=main_keyboard(),
        parse_mode="Markdown"
    )

@bot.message_handler(func=lambda m: m.text == "🏢 Korxona haqida")
def about_handler(message):
    bot.send_message(
        message.chat.id,
        "🏢 *Tomama haqida*\n\n"
        "2009-yildan buyon sifat va ishonchni ustuvor qilgan holda mahsulotlar ishlab chiqaramiz.\n\n"
        "📧 *Email:* tomama-uz@mail.ru\n"
        "📞 *Telefon:* +998 90 554 74 00",
        parse_mode="Markdown"
    )

@bot.message_handler(func=lambda m: m.text == "📞 Aloqa")
def contact_handler(message):
    bot.send_message(
        message.chat.id,
        "📞 *Aloqa ma’lumotlari*\n\n"
        "☎️ *Telefon:* +998 90 554 74 00\n"
        "🕘 *Ish vaqti:* 09:00 – 18:00\n"
        "📅 *Ish kunlari:* Dushanba – Juma",
        parse_mode="Markdown"
    )

@bot.message_handler(func=lambda m: m.text == "🌐 Rasmiy sayt")
def site_handler(message):
    kb = telebot.types.InlineKeyboardMarkup()
    kb.add(
        telebot.types.InlineKeyboardButton(
            "🔗 Tomama.uz saytiga o‘tish",
            url="https://www.tomama.uz"
        )
    )
    bot.send_message(
        message.chat.id,
        "🌍 *Rasmiy veb-saytga kirish*:",
        reply_markup=kb,
        parse_mode="Markdown"
    )

# =======================
# TELEGRAM WEBHOOK
# =======================

@app.route(WEBHOOK_PATH, methods=["POST"])
def telegram_webhook():
    update = telebot.types.Update.de_json(request.data.decode("utf-8"))
    bot.process_new_updates([update])
    return "OK", 200

# =======================
# WEB APP (O‘YIN) - ENDI KERAK EMAS, LEKIN STATIK FAYLLAR QOLADI
# (Agar umuman webapp ishlatilmasa, /game va static route'larni ham o'chirib yuborishingiz mumkin.)
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
