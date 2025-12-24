#!/bin/bash

# Python virtual environment ni ishga tushirish (agar kerak bo'lsa)
# source venv/bin/activate

# Kerakli Python kutubxonalarini o'rnatish
pip install -r requirements.txt

# Telegram botini ishga tushirish
python bot.py
