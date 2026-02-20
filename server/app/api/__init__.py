from .routes.health import health_bp
from .routes.devices import devices_bp
from .routes.device_proxy import device_bp
from .routes.missions import missions_bp
from .routes.stream import stream_bp

def register_blueprints(app):
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(devices_bp, url_prefix="/api")
    app.register_blueprint(device_bp, url_prefix="/api")
    app.register_blueprint(missions_bp, url_prefix="/api")
    app.register_blueprint(stream_bp, url_prefix="/api")
