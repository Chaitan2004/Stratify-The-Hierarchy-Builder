from flask import Flask
from flask_cors import CORS  
from user_routes import user_bp 

app = Flask(__name__)  

CORS(app, origins=["http://localhost:5174"], supports_credentials=True)

app.register_blueprint(user_bp, url_prefix="/api")

if __name__ == "__main__":
    app.run(debug=True, port=5001)
