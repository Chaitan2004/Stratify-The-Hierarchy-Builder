from flask import Flask
from flask_cors import CORS
from notification_routes import notification_bp
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL")
CORS(app, supports_credentials=True, origins=[FRONTEND_URL])

# ✅ Register Blueprint
app.register_blueprint(notification_bp, url_prefix="/api/notify")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5003))
    app.run(host="0.0.0.0", port=port)
