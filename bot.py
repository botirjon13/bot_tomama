from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes

# Tokenni @BotFather dan olingan token bilan almashtiring
TOKEN = '8449204541:AAG8--gTH_dncxMQ5cW1eKh03ht9Y_J7seI'

# Start komandasi uchun callback funksiyasi
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    # Inline tugma yaratish (brauzerga yo'naltirish)
    keyboard = [
        [InlineKeyboardButton("Saytga o'tish", url='https://uztomama-production.up.railway.app/')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    # Foydalanuvchiga xabar yuborish va tugmani ko'rsatish
    # Stringni to'liq yopish
    await update.message.reply_text('Salom! Saytga o'tish uchun quyidagi tugmani bosing:', reply_markup=reply_markup)

# Botni ishga tushurish
async def main():
    # Application obyekti yaratish
    application = Application.builder().token(TOKEN).build()

    # Start komandasi uchun handler qo'shish
    application.add_handler(CommandHandler("start", start))

    # Polling orqali botni ishga tushurish
    await application.run_polling()

# Botni ishga tushirish
if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
