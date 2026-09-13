from collections.abc import Mapping

from flask import Blueprint, Response, jsonify, request, send_file

from .errors import ApiError
from .jobs import JobStatus
from .network_guard import ensure_public_url
from .security import (
    client_address,
    ensure_authenticated,
    ensure_same_origin_request,
    is_authenticated,
    password_matches,
    sign_in,
    sign_out,
)
from .services import current_services
from .storage import ensure_capacity, storage_usage
from .validation import parse_download_options, validate_url

media = Blueprint("media", __name__, url_prefix="/api")

PUBLIC_ENDPOINTS = frozenset(
    {"media.session_status", "media.create_session", "media.delete_session"}
)
MAX_TITLE_LENGTH = 300
NO_CONTENT = ("", 204)


@media.before_request
def guard_request() -> None:
    ensure_same_origin_request()
    if request.endpoint not in PUBLIC_ENDPOINTS:
        ensure_authenticated(current_services().settings)


def json_payload() -> Mapping[str, object]:
    payload = request.get_json(silent=True, force=True)
    if not isinstance(payload, dict):
        raise ApiError(400, "invalid_option", "Send a JSON object.")
    return payload


def checked_url(payload: Mapping[str, object]) -> str:
    url = validate_url(payload.get("url"))
    if not current_services().settings.allow_private_urls:
        ensure_public_url(url)
    return url


def enforce_request_limit() -> None:
    current_services().request_limiter.enforce(client_address())


@media.get("/session")
def session_status() -> Response:
    settings = current_services().settings
    limits = {
        "max_filesize_mb": settings.max_filesize_mb,
        "max_playlist_items": settings.max_playlist_items,
    }
    return jsonify(
        auth_required=bool(settings.password),
        authenticated=is_authenticated(settings),
        limits=limits,
    )


@media.post("/session")
def create_session() -> tuple[str, int]:
    services = current_services()
    services.login_limiter.enforce(client_address())
    if services.settings.password and not password_matches(
        services.settings, json_payload().get("password")
    ):
        raise ApiError(401, "invalid_password", "The password is not correct.")
    sign_in(services.settings)
    return NO_CONTENT


@media.delete("/session")
def delete_session() -> tuple[str, int]:
    sign_out()
    return NO_CONTENT


@media.post("/info")
def get_info() -> Response:
    enforce_request_limit()
    url = checked_url(json_payload())
    return jsonify(current_services().ytdlp.fetch_info(url))


@media.post("/playlist")
def get_playlist() -> Response:
    enforce_request_limit()
    payload = json_payload()
    maximum = current_services().settings.max_playlist_items
    requested = payload.get("limit")
    limit = (
        requested
        if isinstance(requested, int)
        and not isinstance(requested, bool)
        and 0 < requested < maximum
        else maximum
    )
    return jsonify(current_services().ytdlp.fetch_playlist(checked_url(payload), limit))


@media.post("/download")
def start_download() -> tuple[Response, int]:
    enforce_request_limit()
    services = current_services()
    payload = json_payload()
    url = checked_url(payload)
    options = parse_download_options(payload)
    ensure_capacity(
        storage_usage(services.settings.downloads_dir, services.settings.max_storage_gb)
    )
    title = str(payload.get("title") or "")[:MAX_TITLE_LENGTH]
    job = services.jobs.submit(url, title, options)
    return jsonify(job_id=job.job_id, job=services.jobs.to_json(job)), 202


@media.get("/jobs")
def list_jobs() -> Response:
    jobs = current_services().jobs
    return jsonify(jobs=[jobs.to_json(job) for job in jobs.list_jobs()])


@media.get("/status/<job_id>")
def job_status(job_id: str) -> Response:
    jobs = current_services().jobs
    return jsonify(jobs.to_json(jobs.get(job_id)))


@media.delete("/jobs/<job_id>")
def delete_job(job_id: str) -> tuple[str, int]:
    current_services().jobs.cancel_or_remove(job_id)
    return NO_CONTENT


@media.get("/file/<job_id>", defaults={"index": 0})
@media.get("/file/<job_id>/<int:index>")
def download_file(job_id: str, index: int) -> Response:
    job = current_services().jobs.get(job_id)
    if job.status is not JobStatus.DONE:
        raise ApiError(404, "file_not_ready", "The file is not ready yet.")
    if index >= len(job.files):
        raise ApiError(404, "not_found", "File not found.")
    entry = job.files[index]
    return send_file(
        entry.path, as_attachment=True, download_name=entry.name, conditional=True
    )


@media.get("/settings")
def get_settings() -> Response:
    return jsonify(current_services().store.current().to_json())


@media.put("/settings")
def update_settings() -> Response:
    services = current_services()
    updated = services.store.update(json_payload())
    services.jobs.dispatch()
    return jsonify(updated.to_json())


@media.get("/storage")
def get_storage() -> Response:
    settings = current_services().settings
    return jsonify(
        storage_usage(settings.downloads_dir, settings.max_storage_gb).to_json()
    )


@media.get("/cookies")
def get_cookies() -> Response:
    return jsonify(current_services().cookies.summary().to_json())


@media.put("/cookies")
def upload_cookies() -> Response:
    upload = request.files.get("file")
    if upload is None:
        raise ApiError(400, "invalid_cookies", "Choose a cookies.txt file to upload.")
    raw = upload.stream.read(1024 * 1024 + 1)
    return jsonify(current_services().cookies.save(raw).to_json())


@media.delete("/cookies")
def delete_cookies() -> tuple[str, int]:
    current_services().cookies.delete()
    return NO_CONTENT
