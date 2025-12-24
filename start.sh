#!/bin/bash

# Python va pip o'rnatilganligini tekshirish
command -v python3 &>/dev/null || { echo "Python3 o'rnatilmagan"; exit 1; }
command -v pip3 &>/dev/null || { echo "Pip3 o'rnatilmagan"; exit 1; }

# Kerakli Python kutubxonalarini o'rnatish
pip3 install -r requirements.txt

# Telegram botini ishga tushirish
python3 bot.py

