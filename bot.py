import telebot

# Bot tokeni
TOKEN = '8449204541:AAG8--gTH_dncxMQ5cW1eKh03ht9Y_J7seI'

bot = telebot.TeleBot(TOKEN)

# =======================
# ASOSIY KLAWIATURA
# =======================
def main_keyboard():
    markup = telebot.types.ReplyKeyboardMarkup(
        resize_keyboard=True,
        one_time_keyboard=False
    )

    # Har bir tugma alohida qatorda
    markup.add(telebot.types.KeyboardButton("🔹 Korxona Haqida"))
    markup.add(telebot.types.KeyboardButton("📞 Aloqa"))
    markup.add(telebot.types.KeyboardButton("🌐 Saytga O'tish"))

    return markup


# =======================
# /start komandasi
# =======================
@bot.message_handler(commands=['start'])
def send_welcome(message):
    bot.send_message(
        message.chat.id,
        "✨ Salom! Bizning botga xush kelibsiz!\n"
        "Quyidagi tugmalardan foydalaning 👇",
        reply_markup=main_keyboard()
    )


# =======================
# KORXONA HAQIDA
# =======================
@bot.message_handler(func=lambda message: message.text == "🔹 Korxona Haqida")
def send_info(message):
    info_text = (
        "📢 *Bizning Kompaniya Haqida:*\n\n"
        "Bizning kompaniyamiz 2009-yildan buyon "
        "o‘z mijozlariga sifatli mahsulot va xizmatlar "
        "taqdim etib kelmoqda.\n\n"
        "📧 Email: tomama@mail.ru\n"
        "📞 Telefon: +998905547400"
    )

    bot.send_message(
        message.chat.id,
        info_text,
        parse_mode='Markdown',
        reply_markup=main_keyboard()
    )


# =======================
# ALOQA MA'LUMOTLARI
# =======================
@bot.message_handler(func=lambda message: message.text == "📞 Aloqa")
def contact_info(message):
    contact_text = (
        "📬 *Biz bilan bog‘lanish:*\n\n"
        "📧 Email: tomama-uz@mail.ru\n"
        "📞 Telefon: +998905547400\n"
        "🕘 Ish vaqti: 09:00 – 18:00\n"
        "📅 Dushanba – Juma"
    )

    bot.send_message(
        message.chat.id,
        contact_text,
        parse_mode='Markdown',
        reply_markup=main_keyboard()
    )


# =======================
# SAYTGA O‘TISH
# =======================
@bot.message_handler(func=lambda message: message.text == "🌐 Saytga O'tish")
def open_website(message):
    inline = telebot.types.InlineKeyboardMarkup()
    inline.add(
        telebot.types.InlineKeyboardButton(
            "🔗 Saytga o‘tish",
            url="https://uztomama-production.up.railway.app/"
        )
    )

    bot.send_message(
        message.chat.id,
        "🌍 Saytimizga o‘tish uchun tugmani bosing:",
        reply_markup=inline
    )

    # 🔴 MUHIM: telefonda klaviatura yo‘qolmasligi uchun
    bot.send_message(
        message.chat.id,
        "⬇️ Asosiy menyu:",
        reply_markup=main_keyboard()
    )


# =======================
# BOTNI ISHGA TUSHIRISH
# =======================
print("Bot ishga tushdi...")
bot.polling(none_stop=True)
