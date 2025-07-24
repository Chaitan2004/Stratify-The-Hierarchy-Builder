from flask import Flask
from flask_cors import CORS  
from user_routes import user_bp 
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)  

FRONTEND_URL = os.getenv("FRONTEND_URL")


app.register_blueprint(user_bp, url_prefix="/api/user")

CORS(app,
     origins=[FRONTEND_URL],
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug =True)
