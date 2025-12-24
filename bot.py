from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Updater, CommandHandler

# Botni yaratish uchun tokenni @BotFather-dan oling
TOKEN = '8449204541:AAG8--gTH_dncxMQ5cW1eKh03ht9Y_J7seI'

# Start buyrug'i bajarilganda tugma ko'rsatish
def start(update, context):
    # Tugma yaratish
    keyboard = [
        [InlineKeyboardButton("Saytga o'tish", url='https://uztomama-production.up.railway.app/')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    # Foydalanuvchiga xabar yuborish va tugmani ko'rsatish
    update.message.reply_text("Salom! Saytga o'tish uchun quyidagi tugmani bosing:", reply_markup=reply_markup)

# Botni ishga tushurish
def main():
    # Updater yordamida botni ishga tushuramiz
    updater = Updater(TOKEN, use_context=True)

    # Dispatcher orqali start komandasi uchun handler qo'shish
    dp = updater.dispatcher
    dp.add_handler(CommandHandler("start", start))

    # Botni ishga tushurish
    updater.start_polling()

    # Botni to'xtatish uchun
    updater.idle()

if __name__ == '__main__':
    main()
