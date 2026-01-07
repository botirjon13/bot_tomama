from flask import Flask, send_from_directory
import os

app = Flask(__name__, static_folder='webapp')

PORT = int(os.environ.get("PORT", 5000))

# /game route index.html qaytaradi
@app.route("/game")
def game():
    return send_from_directory('webapp', 'index.html')

# boshqa static fayllar uchun
@app.route("/<path:path>")
def static_proxy(path):
    return send_from_directory('webapp', path)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
