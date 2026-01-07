from flask import Flask, send_from_directory
import os

# Flask app, webapp papkasi static fayllar uchun
app = Flask(__name__, static_folder='webapp')

# Railway portini olish
PORT = int(os.environ.get("PORT", 8080))

# ==========================================
# /game route → index.html ni qaytaradi
# ==========================================
@app.route("/game")
def game():
    return send_from_directory('webapp', 'index.html')

# ==========================================
# Boshqa static fayllar (JS, CSS, assets)
# ==========================================
@app.route("/<path:path>")
def static_files(path):
    return send_from_directory('webapp', path)

# ==========================================
# Serverni ishga tushirish
# ==========================================
if __name__ == "__main__":
    # 0.0.0.0 → tashqi trafikni qabul qiladi
    # PORT → Railway container tomonidan berilgan port
    app.run(host="0.0.0.0", port=PORT)
