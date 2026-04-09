from .routes.health import health_bp
from .routes.devices import devices_bp
from .routes.device_proxy import device_bp
from .routes.missions import missions_bp
from app.api.routes.sync import sync_bp
from app.api.routes.missions_db import missions_db_bp
from app.api.routes.start_points import start_points_bp
from .routes.mission_control import mission_control_bp


def register_blueprints(app):
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(devices_bp, url_prefix="/api")
    app.register_blueprint(device_bp, url_prefix="/api")
    app.register_blueprint(missions_bp, url_prefix="/api")
    app.register_blueprint(sync_bp, url_prefix="/api")
    app.register_blueprint(missions_db_bp, url_prefix="/api")
    app.register_blueprint(start_points_bp, url_prefix="/api")
    app.register_blueprint(mission_control_bp, url_prefix="/api")
