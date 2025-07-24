from flask import Flask
from flask_cors import CORS
from community_routes import community_bp
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Enable CORS (important for frontend-backend communication)
FRONTEND_URL = os.getenv("FRONTEND_URL")

# Register the blueprint
app.register_blueprint(community_bp, url_prefix="/api/community")
CORS(app,
     origins=[FRONTEND_URL],
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    app.run(port=port, host="0.0.0.0")
