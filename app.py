import os
from flask import Flask, send_from_directory, request # <-- 'request' qo'shildi
import telebot # <-- 'telebot' import qilindi (avvalgi xato shu edi)

# 1. SOZLAMALAR
TOKEN = '8449204541:AAG8--gTH_dncxMQ5cW1eKh03ht9Y_J7seI'
bot = telebot.TeleBot(TOKEN)

# Flaskni bir marta va to'g'ri sozlaymiz
app = Flask(__name__, static_folder='webapp')

# Railway portini o'qib olish
PORT = int(os.environ.get("PORT", 8080))
# Webhook URL manzili (sizning Railway domeningiz)
WEBHOOK_URL = f"bot-telegram-production-d731.up.railway.app{TOKEN}"

# =======================
# KLAWIATURA
# =======================
def main_keyboard():
    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.row("🔹 Korxona Haqida", "📞 Aloqa")
    markup.row("🌐 Saytga O'tish")
    
    # WebApp uchun maxsus klaviatura tugmasi
    game_url = "bot-telegram-production-d731.up.railway.app"
    webapp_info = telebot.types.WebAppInfo(url=game_url)
    markup.row(telebot.types.KeyboardButton("🎮 Tomama O‘yini", web_app=webapp_info))
    
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
    game_url = "bot-telegram-production-d731.up.railway.appgame"
    inline.add(telebot.types.InlineKeyboardButton(
        text="▶️ O‘yinni boshlash",
        web_app=telebot.types.WebAppInfo(url=game_url)
    ))
    bot.send_message(message.chat.id, "🍅 Tomama o‘yiniga xush kelibsiz!\nBoshlash uchun tugmani bosing 👇", reply_markup=inline)

# =======================
# FLASK VA WEBHOOK QISMI (Polling va Threading o'rniga)
# =======================

@app.route(f'/{TOKEN}', methods=['POST'])
def get_message():
    """Telegramdan kelgan xabarlarni qabul qilib, botga uzatadi"""
    json_string = request.get_data().decode('utf-8')
    update = telebot.types.Update.de_json(json_string)
    bot.process_new_updates([update])
    return "!", 200

@app.route("/game")
def game_page():
    """O'yin (WebApp) sahifasini yuklaydi"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route("/<path:path>")
def static_files(path):
    """Assets, JS, CSS kabi statik fayllarni tarqatadi"""
    return send_from_directory(app.static_folder, path)

@app.route("/")
def health_check():
    """Server ishlayotganini va webhook o'rnatilganini tekshiradi"""
    # Har safar asosiy manzilga kirilganda webhookni yangilaymiz
    bot.remove_webhook()
    bot.set_webhook(url=WEBHOOK_URL)
    return "Bot is running and webhook set!", 200

# =======================
# ISHGA TUSHIRISH
# =======================

if __name__ == "__main__":
    # Flask serverni ishga tushiramiz (Threading butunlay olib tashlandi)
    print(f"Server {PORT}-portda ishlamoqda...")
    app.run(host="0.0.0.0", port=PORT, debug=False)
