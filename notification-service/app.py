from flask import Flask
from flask_cors import CORS
from notification_routes import notification_bp

app = Flask(__name__)

CORS(app, supports_credentials=True, origins=["http://localhost:5174"])

# ✅ Register Blueprint
app.register_blueprint(notification_bp, url_prefix="/api/notify")

if __name__ == "__main__":
    app.run(port=5003, debug=True)
