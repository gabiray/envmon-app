from flask import Flask
from .config import Config
from .extensions import cors
from .api import register_blueprints

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    register_blueprints(app)
    return app
