from flask import Flask
from flask_cors import CORS
from community_routes import community_bp
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Enable CORS (important for frontend-backend communication)
FRONTEND_URL = os.getenv("FRONTEND_URL")
CORS(app, supports_credentials=True, origins=[FRONTEND_URL])

# Register the blueprint
app.register_blueprint(community_bp, url_prefix="/api/community")

if __name__ == "__main__":
    app.run(port=5002, debug=True)
