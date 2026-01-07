from flask import Flask, send_from_directory
import os

app = Flask(__name__, static_folder='webapp')
PORT = int(os.environ.get("PORT", 8080))

@app.route("/game")
def game():
    return send_from_directory('webapp', 'index.html')

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory('webapp', path)

if __name__ == "__main__":
    # Development uchun: python app.py
    app.run(host="0.0.0.0", port=PORT)
