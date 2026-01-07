import telebot
import os
import threading
from flask import Flask, send_from_directory

# 1. SOZLAMALAR
TOKEN = '8449204541:AAG8--gTH_dncxMQ5cW1eKh03ht9Y_J7seI'
bot = telebot.TeleBot(TOKEN)
app = Flask(__name__, static_folder='webapp')
PORT = int(os.environ.get("PORT", 8080))

# Importlardan keyin, TOKEN qatoridan oldin qo'shing
def start_bot_in_background():
    print("Bot orqa fonda ishga tushirilmoqda...")
    t = threading.Thread(target=lambda: bot.infinity_polling(none_stop=True))
    t.daemon = True
    t.start()

# Botni darhol ishga tushiramiz
start_bot_in_background()

# =======================
# KLAWIATURA (Tugmalar matni bu yerda)
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
    inline.add(telebot.types.InlineKeyboardButton(
        text="▶️ O‘yinni boshlash",
        web_app=telebot.types.WebAppInfo(url="https://bot-telegram-production-d731.up.railway.app/game")
    ))
    bot.send_message(message.chat.id, "🍅 Tomama o‘yiniga xush kelibsiz!\nBoshlash uchun tugmani bosing 👇", reply_markup=inline)

# =======================
# FLASK VA SERVER QISMI
# =======================

@app.route("/game")
def game():
    return send_from_directory('webapp', 'index.html')

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory('webapp', path)

@app.route("/")
def health_check():
    return "Bot is running!", 200

def run_bot():
    print("Bot polling boshlandi...")
    bot.infinity_polling()

if __name__ == "__main__":
    # Botni orqa fonda ishga tushirish
    t = threading.Thread(target=run_bot)
    t.daemon = True
    t.start()
    
    # Flaskni asosiy portda ishga tushirish
    app.run(host="0.0.0.0", port=PORT)
