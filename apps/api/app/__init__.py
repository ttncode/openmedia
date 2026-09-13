from flask import Flask

from .health import health as health_blueprint


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["OPENMEDIA_DATA_DIR"] = "/data"
    app.register_blueprint(health_blueprint)
    return app
