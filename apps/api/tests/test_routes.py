import io
import json
from collections.abc import Iterator
from dataclasses import replace

import pytest
from flask import Flask
from flask.testing import FlaskClient

from app import create_app
from app.config import Settings
from app.services import (
    LOGIN_ATTEMPTS_PER_MINUTE_ALL_CLIENTS,
    Services,
    build_services,
)
from app.storage import StorageUsage
from app.ytdlp import CompletedRun

from .test_cookies import COOKIES
from .test_jobs import ProcessScript
from .test_ytdlp import RecordingRunner

URL = "https://www.youtube.com/watch?v=abc"
INFO = {
    "id": "abc",
    "title": "Pho",
    "duration": 1122,
    "formats": [{"format_id": "137", "height": 1080, "vcodec": "avc1", "tbr": 1}],
}


def build(
    settings: Settings,
    script: ProcessScript | None = None,
    output: dict[str, object] | None = None,
) -> tuple[Flask, Services]:
    runner = RecordingRunner(CompletedRun(0, json.dumps(output or INFO), ""))
    services = build_services(
        settings,
        process_factory=script or ProcessScript([], {"media.mp4": 12}),
        runner=runner,
    )
    return create_app(settings, services), services


@pytest.fixture
def open_settings(settings: Settings) -> Settings:
    return replace(settings, allow_private_urls=True)


@pytest.fixture
def client(open_settings: Settings) -> Iterator[FlaskClient]:
    app, _ = build(open_settings)
    yield app.test_client()


def test_session_without_password(client: FlaskClient) -> None:
    body = client.get("/api/session").get_json()
    assert body == {
        "auth_required": False,
        "authenticated": True,
        "limits": {"max_filesize_mb": 4096, "max_playlist_items": 50},
    }


def test_password_protects_the_api(open_settings: Settings) -> None:
    app, _ = build(replace(open_settings, password="hunter2"))
    client = app.test_client()
    assert client.get("/api/jobs").get_json()["code"] == "auth_required"
    assert client.post("/api/session", json={"password": "nope"}).status_code == 401
    assert client.post("/api/session", json={"password": "hunter2"}).status_code == 204
    assert client.get("/api/jobs").status_code == 200
    assert client.delete("/api/session").status_code == 204
    assert client.get("/api/jobs").status_code == 401


def test_cross_site_post_is_rejected(client: FlaskClient) -> None:
    response = client.post(
        "/api/info", json={"url": URL}, headers={"Sec-Fetch-Site": "cross-site"}
    )
    assert (response.status_code, response.get_json()["code"]) == (
        403,
        "cross_site_request",
    )


def test_info_returns_the_summary(client: FlaskClient) -> None:
    body = client.post("/api/info", json={"url": URL}).get_json()
    assert body["title"] == "Pho"
    assert body["formats"][0] == {
        "id": "137",
        "label": "1080p",
        "height": 1080,
        "ext": None,
        "filesize": None,
    }


def test_reclip_injection_payload_is_rejected(client: FlaskClient) -> None:
    response = client.post("/api/info", json={"url": "--exec=touch /tmp/pwned"})
    assert (response.status_code, response.get_json()["code"]) == (400, "invalid_url")
    assert "error" in response.get_json()


def test_private_network_is_blocked_by_default(settings: Settings) -> None:
    app, _ = build(settings)
    response = app.test_client().post(
        "/api/info", json={"url": "http://127.0.0.1:8080/admin"}
    )
    assert response.get_json()["code"] == "private_network"


def test_playlist_is_limited(open_settings: Settings) -> None:
    document: dict[str, object] = {
        "title": "Mix",
        "entries": [{"url": f"{URL}{n}"} for n in range(80)],
    }
    app, _ = build(open_settings, output=document)
    body = app.test_client().post("/api/playlist", json={"url": URL}).get_json()
    assert body["count"] == 50


def test_reclip_download_flow(open_settings: Settings) -> None:
    app, services = build(open_settings)
    client = app.test_client()
    response = client.post(
        "/api/download",
        json={"url": URL, "format": "video", "format_id": "137", "title": "Pho bo"},
    )
    assert response.status_code == 202
    job_id = response.get_json()["job_id"]
    assert services.jobs.wait_until_idle(5)
    status = client.get(f"/api/status/{job_id}").get_json()
    assert (status["status"], status["error"], status["filename"]) == (
        "done",
        None,
        "Pho bo.mp4",
    )
    file_response = client.get(f"/api/file/{job_id}")
    assert file_response.status_code == 200
    assert file_response.data == b"x" * 12
    assert (
        "Pho%20bo.mp4" in file_response.headers["Content-Disposition"]
        or "Pho bo.mp4" in file_response.headers["Content-Disposition"]
    )
    assert client.get(f"/api/file/{job_id}/5").get_json()["code"] == "not_found"


def test_file_not_ready_while_downloading(open_settings: Settings) -> None:
    script = ProcessScript([], {"media.mp4": 1}, hold=True)
    app, services = build(open_settings, script=script)
    client = app.test_client()
    job_id = client.post("/api/download", json={"url": URL}).get_json()["job_id"]
    assert client.get(f"/api/file/{job_id}").get_json()["code"] == "file_not_ready"
    assert client.delete(f"/api/jobs/{job_id}").status_code == 204
    script.release.set()
    assert services.jobs.wait_until_idle(5)
    assert client.get(f"/api/status/{job_id}").get_json()["status"] == "cancelled"


def test_jobs_list_and_remove(client: FlaskClient) -> None:
    job_id = client.post(
        "/api/download", json={"url": URL, "format": "audio"}
    ).get_json()["job_id"]
    jobs = client.get("/api/jobs").get_json()["jobs"]
    assert [job["job_id"] for job in jobs] == [job_id]


def test_storage_full_refuses_downloads(
    open_settings: Settings, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "app.media.storage_usage", lambda directory, limit: StorageUsage(10, 10, 0)
    )
    app, _ = build(open_settings)
    response = app.test_client().post("/api/download", json={"url": URL})
    assert (response.status_code, response.get_json()["code"]) == (507, "storage_full")


def test_settings_round_trip(client: FlaskClient) -> None:
    assert client.get("/api/settings").get_json() == {
        "retention_minutes": 60,
        "max_concurrent": 3,
    }
    assert (
        client.put("/api/settings", json={"max_concurrent": 5}).get_json()[
            "max_concurrent"
        ]
        == 5
    )
    assert client.put("/api/settings", json={"retention_minutes": 7}).status_code == 400


def test_storage_reports_usage(client: FlaskClient) -> None:
    body = client.get("/api/storage").get_json()
    assert set(body) == {"used_bytes", "limit_bytes", "free_bytes"}


def test_cookie_upload_and_removal(client: FlaskClient) -> None:
    upload = client.put(
        "/api/cookies",
        data={"file": (io.BytesIO(COOKIES.encode()), "cookies.txt")},
        content_type="multipart/form-data",
    )
    assert upload.status_code == 200
    assert upload.get_json()["domains"] == ["accounts.google.com", "youtube.com"]
    bad = client.put(
        "/api/cookies",
        data={"file": (io.BytesIO(b"nope"), "cookies.txt")},
        content_type="multipart/form-data",
    )
    assert bad.get_json()["code"] == "invalid_cookies"
    assert (
        client.put(
            "/api/cookies", data={}, content_type="multipart/form-data"
        ).get_json()["code"]
        == "invalid_cookies"
    )
    assert client.delete("/api/cookies").status_code == 204
    assert client.get("/api/cookies").get_json()["present"] is False


def test_rate_limit(open_settings: Settings) -> None:
    app, _ = build(replace(open_settings, rate_limit_per_minute=2))
    client = app.test_client()
    client.post("/api/info", json={"url": URL})
    client.post("/api/info", json={"url": URL})
    limited = client.post("/api/info", json={"url": URL})
    assert limited.status_code == 429
    assert "Retry-After" in limited.headers


def test_unknown_route_is_json(client: FlaskClient) -> None:
    response = client.get("/api/nope")
    assert response.status_code == 404
    assert response.get_json()["code"] == "not_found"


def test_sign_in_attempts_are_limited_across_rotating_client_addresses(
    open_settings: Settings,
) -> None:
    app, _ = build(replace(open_settings, password="hunter2"))
    client = app.test_client()
    statuses = [
        client.post(
            "/api/session",
            json={"password": "nope"},
            headers={"X-Forwarded-For": f"203.0.113.{attempt}"},
        ).status_code
        for attempt in range(LOGIN_ATTEMPTS_PER_MINUTE_ALL_CLIENTS + 1)
    ]
    assert set(statuses[:-1]) == {401}
    assert statuses[-1] == 429


def test_writes_through_the_web_proxy_succeed_with_extra_trusted_hops(
    open_settings: Settings,
) -> None:
    app, _ = build(replace(open_settings, trusted_proxy_hops=2))
    response = app.test_client().put(
        "/api/settings",
        json={"max_concurrent": 2},
        base_url="http://api:8080",
        headers={
            "Origin": "https://openmedia.example.com",
            "Sec-Fetch-Site": "same-origin",
            "X-Forwarded-Host": "openmedia.example.com",
            "X-Forwarded-Proto": "https",
            "X-Forwarded-For": "198.51.100.7, 203.0.113.9",
        },
    )
    assert response.status_code == 200
