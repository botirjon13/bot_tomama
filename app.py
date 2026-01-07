import telebot
import os
import threading
from flask import Flask, send_from_directory

# 1. SOZLAMALAR
TOKEN = '8449204541:AAG8--gTH_dncxMQ5cW1eKh03ht9Y_J7seI'
bot = telebot.TeleBot(TOKEN)

# Flaskni bir marta va to'g'ri sozlaymiz
app = Flask(__name__, static_folder='webapp')
PORT = int(os.environ.get("PORT", 8080))

# =======================
# KLAWIATURA
# =======================
def main_keyboard():
    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row("🔹 Korxona Haqida", "📞 Aloqa")
    markup.row("🌐 Saytga O'tish", "🎮 Tomama O‘yini")
    return markup

# =======================
# BOT LOGIKASI
# =======================

@bot.message_handler(commands=['start'])
def send_welcome(message):
    bot.send_message(
        message.chat.id, 
        "✨ Salom! Tomama rasmiy botiga xush kelibsiz!\nQuyidagi tugmalardan foydalaning 👇", 
        reply_markup=main_keyboard()
    )

@bot.message_handler(func=lambda message: message.text == "🔹 Korxona Haqida")
def info_handler(message):
    text = (
        "📢 *Bizning Kompaniya Haqida:*\n\n"
        "Bizning kompaniyamiz 2009-yildan buyon "
        "o‘z mijozlariga sifatli mahsulot va xizmatlar "
        "taqdim etib kelmoqda.\n\n"
        "📧 Email: tomama-uz@mail.ru\n"
        "📞 Telefon: +998905547400"
    )
    bot.send_message(message.chat.id, text, parse_mode='Markdown')

@bot.message_handler(func=lambda message: message.text == "📞 Aloqa")
def contact_handler(message):
    text = (
        "📬 *Biz bilan bog‘lanish:*\n\n"
        "📧 Email: tomama-uz@mail.ru\n"
        "📞 Telefon: +998905547400\n"
        "🕘 Ish vaqti: 09:00 – 18:00\n"
        "📅 Dushanba – Juma"
    )
    bot.send_message(message.chat.id, text, parse_mode='Markdown')

@bot.message_handler(func=lambda message: message.text == "🌐 Saytga O'tish")
def website_handler(message):
    inline = telebot.types.InlineKeyboardMarkup()
    inline.add(telebot.types.InlineKeyboardButton("🔗 Saytga o‘tish", url="http://www.tomama.uz"))
    bot.send_message(message.chat.id, "🌍 Saytimizga o‘tish uchun pastdagi tugmani bosing:", reply_markup=inline)

@bot.message_handler(func=lambda message: message.text == "🎮 Tomama O‘yini")
def game_handler(message):
    inline = telebot.types.InlineKeyboardMarkup()
    # URL oxiriga / belgisini qo'shish tavsiya etiladi
    game_url = "https://bot-telegram-production-d731.up.railway.app/game"
    inline.add(telebot.types.InlineKeyboardButton(
        text="▶️ O‘yinni boshlash",
        web_app=telebot.types.WebAppInfo(url=game_url)
    ))
    bot.send_message(message.chat.id, "🍅 Tomama o‘yiniga xush kelibsiz!\nBoshlash uchun tugmani bosing 👇", reply_markup=inline)

# =======================
# FLASK VA SERVER QISMI
# =======================

@app.route("/game")
def game_page():
    # Index.html faylini webapp papkasidan yuborish
    return send_from_directory(app.static_folder, 'index.html')

@app.route("/<path:path>")
def static_files(path):
    # assets, game.js va boshqa fayllarni yuborish
    return send_from_directory(app.static_folder, path)

@app.route("/")
def health_check():
    return "Bot is running!", 200

# =======================
# ISHGA TUSHIRISH
# =======================

def run_bot():
    print("Bot polling boshlandi...")
    bot.infinity_polling(none_stop=True)

if __name__ == "__main__":
    # Botni alohida oqimda (thread) ishga tushiramiz
    bot_thread = threading.Thread(target=run_bot)
    bot_thread.daemon = True
    bot_thread.start()
    
    # Flask serverni ishga tushiramiz
    print(f"Server {PORT}-portda ishlamoqda...")
    app.run(host="0.0.0.0", port=PORT)
