import telebot

# Bot tokenini @BotFather dan olingan token bilan almashtiring
TOKEN = '8449204541:AAG8--gTH_dncxMQ5cW1eKh03ht9Y_J7seI'

# telebot obyekti yaratish
bot = telebot.TeleBot(TOKEN)

# /start komandasi uchun callback
@bot.message_handler(commands=['start'])
def send_welcome(message):
    bot.reply_to(message, "Salom! Saytga o'tish uchun quyidagi tugmani bosing:")
    markup = telebot.types.InlineKeyboardMarkup()
    markup.add(telebot.types.InlineKeyboardButton("Saytga o'tish", url='https://uztomama-production.up.railway.app/'))
    bot.send_message(message.chat.id, "Saytga o'tish uchun quyidagi tugmani bosing:", reply_markup=markup)

# Botni ishga tushirish
bot.polling()
