import telebot
import os
import threading
from flask import Flask, send_from_directory

# 1. SOZLAMALAR
TOKEN = '8449204541:AAG8--gTH_dncxMQ5cW1eKh03ht9Y_J7seI'
bot = telebot.TeleBot(TOKEN)
app = Flask(__name__, static_folder='webapp')
PORT = int(os.environ.get("PORT", 8080))

# =======================
# FLASK QISMI (Veb-sayt va O'yin uchun)
# =======================
@app.route("/game")
def game():
    return send_from_directory('webapp', 'index.html')

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory('webapp', path)

@app.route("/")
def index():
    return "Bot va O'yin ishlamoqda!"

# =======================
# BOT QISMI (Siz yuborgan kod)
# =======================
def main_keyboard():
    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.add("🔹 Korxona Haqida", "📞 Aloqa")
    markup.add("🌐 Saytga O'tish", "🎮 Tomama O‘yini")
    return markup

@bot.message_handler(commands=['start'])
def send_welcome(message):
    bot.send_message(message.chat.id, "✨ Salom! Botga xush kelibsiz!", reply_markup=main_keyboard())

@bot.message_handler(func=lambda message: message.text == "🎮 Tomama O‘yini")
def open_game(message):
    inline = telebot.types.InlineKeyboardMarkup()
    inline.add(telebot.types.InlineKeyboardButton(
        text="▶️ O‘yinni boshlash",
        web_app=telebot.types.WebAppInfo(url="https://uztomama-production.up.railway.app/game")
    ))
    bot.send_message(message.chat.id, "🍅 O'yinni boshlang:", reply_markup=inline)

# Korxona va Aloqa funksiyalarini ham shu yerga qo'shib qo'ying (Siz yozgan kod)

# =======================
# IKKALASINI BIRGA ISHLATISH
# =======================
def run_bot():
    print("Bot polling boshlandi...")
    bot.infinity_polling()

if __name__ == "__main__":
    # Botni alohida oqimda (Thread) ishga tushiramiz
    bot_thread = threading.Thread(target=run_bot)
    bot_thread.daemon = True
    bot_thread.start()

    # Flaskni asosiy oqimda ishga tushiramiz
    print(f"Server {PORT}-portda ishga tushdi...")
    app.run(host="0.0.0.0", port=PORT)
