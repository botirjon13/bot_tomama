from flask import Flask, send_from_directory
import os
import threading
import asyncio
from aiogram import Bot, Dispatcher, types

app = Flask(__name__, static_folder='webapp')
PORT = int(os.environ.get("PORT", 8080))
TOKEN = os.getenv("BOT_TOKEN") # .env faylda bo'lishi kerak

# 1. Flask yo'nalishlari
@app.route("/game")
def game():
    return send_from_directory('webapp', 'index.html')

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory('webapp', path)

# 2. Bot qismi (aiogram 3.x misolida)
bot = Bot(token=TOKEN)
dp = Dispatcher()

@dp.message()
async def start_command(message: types.Message):
    await message.answer("Salom! O'yinni boshlash uchun tugmani bosing.")

async def main_bot():
    await dp.start_polling(bot)

# 3. Ikkalasini birga ishga tushirish
if __name__ == "__main__":
    # Botni alohida oqimda (thread) ishga tushiramiz
    def run_bot():
        asyncio.run(main_bot())

    threading.Thread(target=run_bot, daemon=True).start()

    # Flaskni asosiy oqimda ishga tushiramiz
    app.run(host="0.0.0.0", port=PORT)
