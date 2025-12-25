import telebot

# Bot tokenini @BotFather dan olingan token bilan almashtiring
TOKEN = '8449204541:AAG8--gTH_dncxMQ5cW1eKh03ht9Y_J7seI'

# telebot obyekti yaratish
bot = telebot.TeleBot(TOKEN)

# /start komandasi uchun callback
@bot.message_handler(commands=['start'])
def send_welcome(message):
    # Foydalanuvchiga doimiy tugmalar bilan ko'rsatish
    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True, one_time_keyboard=False)
    markup.add("Korxona Haqida Ma'lumot", "Aloqa Ma'lumotlari", "Saytga O'tish")

    bot.reply_to(message, "Salom! Quyidagi tugmalardan foydalaning:", reply_markup=markup)

# Korxona haqida ma'lumot
@bot.message_handler(func=lambda message: message.text == "Korxona Haqida Ma'lumot")
def send_info(message):
    bot.reply_to(message, "Bizning kompaniyamiz 2015 yildan beri sifatli mahsulotlar va xizmatlarni taqdim etib kelmoqda. "
                           "Yordam olish uchun quyidagi manzilga murojaat qilishingiz mumkin: www.korxona-websayti.com")

# Foydalanuvchilar uchun aloqa ma'lumotlari
@bot.message_handler(func=lambda message: message.text == "Aloqa Ma'lumotlari")
def contact_info(message):
    bot.reply_to(message, "Biz bilan bog'lanish uchun telefon: +998901234567\nYoki elektron pochta: example@korxona.uz")

# Saytga o'tish tugmasi
@bot.message_handler(func=lambda message: message.text == "Saytga O'tish")
def open_website(message):
    markup = telebot.types.InlineKeyboardMarkup()
    markup.add(telebot.types.InlineKeyboardButton("Saytga O'tish", url='https://uztomama-production.up.railway.app/'))
    bot.send_message(message.chat.id, "Saytga o'tish uchun tugmani bosing:", reply_markup=markup)

# Botni ishga tushirish
bot.polling()
