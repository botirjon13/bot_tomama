import os
from flask import Flask, send_from_directory, request
import telebot

# 1. SOZLAMALAR
TOKEN = '8449204541:AAG8--gTH_dncxMQ5cW1eKh03ht9Y_J7seI'
bot = telebot.TeleBot(TOKEN)
app = Flask(__name__, static_folder='webapp')

PORT = int(os.environ.get("PORT", 8080))
# Webhook URL manzili
WEBHOOK_URL = f"https://bot-telegram-production-d731.up.railway.app/{TOKEN}"

# =======================
# KLAWIATURA (va boshqa handlerlar joyida qoladi)
# ... (bu qismlarni o'z kodingizdan ko'chiring) ...
# =======================
def main_keyboard():
    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row("🔹 Korxona Haqida", "📞 Aloqa")
    markup.row("🌐 Saytga O'tish", "🎮 Tomama O‘yini")
    return markup

@bot.message_handler(commands=['start'])
def send_welcome(message):
    bot.send_message(
        message.chat.id, 
        "✨ Salom! Tomama rasmiy botiga xush kelibsiz!\nQuyidagi tugmalardan foydalaning 👇", 
        reply_markup=main_keyboard()
    )
# ... (Boshqa message_handler funksiyalarini ham shu yerga qo'shing) ...
# =======================

# =======================
# FLASK VA WEBHOOK QISMI
# =======================

@app.route(f'/{TOKEN}', methods=['POST'])
def get_message():
    """Telegramdan kelgan xabarlarni qabul qilib, botga uzatadi"""
    if request.headers.get('content-type') == 'application/json':
        json_string = request.get_data().decode('utf-8')
        update = telebot.types.Update.de_json(json_string)
        bot.process_new_updates([update])
        return "!", 200
    else:
        # Agar Telegramdan kelmagan so'rov bo'lsa
        return "Bad Request", 403

@app.route("/game")
def game_page():
    # O'yin (WebApp) sahifasini yuklaydi
    return send_from_directory(app.static_folder, 'index.html')

@app.route("/<path:path>")
def static_files(path):
    # Assets, JS, CSS kabi statik fayllarni tarqatadi
    return send_from_directory(app.static_folder, path)

@app.route("/")
def health_check():
    """Server ishlayotganini va webhook o'rnatilganini tekshiradi"""
    # Har safar asosiy manzilga kirilganda webhookni yangilaymiz
    bot.remove_webhook()
    bot.set_webhook(url=WEBHOOK_URL)
    return "Bot is running and webhook set!", 200

# =======================
# ISHGA TUSHIRISH (Threading butunlay olib tashlandi)
# =======================

if __name__ == "__main__":
    # Flask serverni gunicorn orqali ishga tushirish uchun
    # Bu qism faqat lokal testda ishlaydi, Railway o'zi gunicornni ishlatadi
    print(f"Server {PORT}-portda ishlamoqda...")
    app.run(host="0.0.0.0", port=PORT, debug=False)
