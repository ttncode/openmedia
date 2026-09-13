from datetime import timedelta

from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

from .cleanup import RetentionSweeper, remove_orphan_directories
from .config import Settings, load_settings
from .errors import register_error_handlers
from .health import health as health_blueprint
from .media import media as media_blueprint
from .security import ForwardedProtoSessionInterface, load_or_create_secret_key
from .services import EXTENSION_KEY, Services, build_services

MAX_REQUEST_BYTES = 2 * 1024 * 1024
SESSION_LIFETIME = timedelta(days=30)


def _configure(app: Flask, settings: Settings) -> None:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    app.config.update(
        SECRET_KEY=load_or_create_secret_key(settings),
        SESSION_COOKIE_NAME="openmedia_session",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        PERMANENT_SESSION_LIFETIME=SESSION_LIFETIME,
        MAX_CONTENT_LENGTH=MAX_REQUEST_BYTES,
        OPENMEDIA_DATA_DIR=str(settings.data_dir),
    )
    app.session_interface = ForwardedProtoSessionInterface()
    hops = settings.trusted_proxy_hops
    object.__setattr__(
        app, "wsgi_app", ProxyFix(app.wsgi_app, x_for=hops, x_proto=hops, x_host=hops)
    )


def _start_services(settings: Settings) -> Services:
    services = build_services(settings)
    remove_orphan_directories(settings.downloads_dir, services.jobs.known_job_ids())
    RetentionSweeper(services.jobs, services.store).start()
    return services


def create_app(
    settings: Settings | None = None, services: Services | None = None
) -> Flask:
    resolved = settings or load_settings()
    app = Flask(__name__)
    _configure(app, resolved)
    register_error_handlers(app)
    app.register_blueprint(health_blueprint)
    app.register_blueprint(media_blueprint)
    app.extensions[EXTENSION_KEY] = services or _start_services(resolved)
    return app
