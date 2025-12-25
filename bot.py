import telebot

# Bot tokenini @BotFather dan olingan token bilan almashtiring
TOKEN = '8449204541:AAG8--gTH_dncxMQ5cW1eKh03ht9Y_J7seI'

# telebot obyekti yaratish
bot = telebot.TeleBot(TOKEN)

# /start komandasi uchun callback
@bot.message_handler(commands=['start'])
def send_welcome(message):
    # Tugmalarni kengaytirish va matnni qisqartirish
    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True, one_time_keyboard=False)
    markup.add("🔹 Korxona Haqida", "📞 Aloqa", "🌐 Saytga O'tish")
    
    bot.reply_to(message, 
                 "✨ Salom! Bizning botga xush kelibsiz! Quyidagi tugmalardan foydalanib, korxonamiz haqidagi "
                 "ma'lumotlarga, aloqa ma'lumotlariga va saytimizga kirishga imkoniyat topasiz. ",
                 reply_markup=markup)

# Korxona haqida ma'lumot
@bot.message_handler(func=lambda message: message.text == "🔹 Korxona Haqida Ma'lumot")
def send_info(message):
    info_text = """
    📢 **Bizning Kompaniya Haqida:**
    
    Bizning kompaniyamiz 2009-yildan buyon o'z mijozlarimizga sifatli mahsulotlar va xizmatlar taqdim etib kelmoqda.
    
    🌟 **Yordam olish uchun biz bilan bog'laning!**
    
    - 📧 Elektron pochta: tomama@mail.ru
    - 📞 Telefon: +998905547400
    """
    bot.reply_to(message, info_text, parse_mode='Markdown')

# Foydalanuvchilar uchun aloqa ma'lumotlari
@bot.message_handler(func=lambda message: message.text == "📞 Aloqa Ma'lumotlari")
def contact_info(message):
    contact_text = """
    📬 **Biz bilan bog'lanish:**
    
    - 📧 **Email:** tomama-uz@mail.ru
    - 📞 **Telefon raqami:** +998905547400
    - 🕑 **Ish vaqti:** Dushanbadan Jumagacha, 9:00 - 18:00
    """
    bot.reply_to(message, contact_text, parse_mode='Markdown')

# Saytga o'tish tugmasi
@bot.message_handler(func=lambda message: message.text == "🌐 Saytga O'tish")
def open_website(message):
    markup = telebot.types.InlineKeyboardMarkup()
    markup.add(telebot.types.InlineKeyboardButton("🔗 Saytga O'tish", url='https://uztomama-production.up.railway.app/'))
    bot.send_message(message.chat.id, 
                     "👨‍💻 Bizning saytimizga o'tish uchun quyidagi tugmani bosing:", 
                     reply_markup=markup)

# Botni ishga tushirish
bot.polling()
