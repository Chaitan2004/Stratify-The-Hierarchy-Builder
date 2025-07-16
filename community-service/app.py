from flask import Flask
from flask_cors import CORS
from community_routes import community_bp

app = Flask(__name__)

# Enable CORS (important for frontend-backend communication)
CORS(app, supports_credentials=True, origins=["http://localhost:5174"])

# Register the blueprint
app.register_blueprint(community_bp, url_prefix="/api/community")

if __name__ == "__main__":
    app.run(port=5002, debug=True)
