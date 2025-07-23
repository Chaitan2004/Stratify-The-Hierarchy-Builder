from flask import Flask
from flask_cors import CORS
from notification_routes import notification_bp
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL")
CORS(app,
     origins=[FRONTEND_URL],
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True)
# ✅ Register Blueprint
app.register_blueprint(notification_bp, url_prefix="/api/notify")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5003))
    app.run(host="0.0.0.0", port=port)
