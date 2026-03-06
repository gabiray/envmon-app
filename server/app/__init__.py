from flask import Flask
from .config import Config
from .extensions import cors
from .api import register_blueprints
from app.db.session import init_db


def create_app():
    init_db()
    
    app = Flask(__name__)
    app.config.from_object(Config)

    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    register_blueprints(app)
    return app
