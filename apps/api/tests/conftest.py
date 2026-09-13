from dataclasses import replace
from pathlib import Path
from typing import Any

import pytest

from app.config import Settings


def make_settings(data_dir: Path, **overrides: Any) -> Settings:
    base = Settings(
        data_dir=data_dir,
        password="",
        secret_key="test-secret-key",
        retention_minutes=60,
        max_concurrent=3,
        max_filesize_mb=4096,
        max_storage_gb=0,
        max_playlist_items=50,
        rate_limit_per_minute=30,
        stall_timeout_seconds=180,
        allow_private_urls=False,
        trusted_proxy_hops=1,
        ytdlp_proxy="",
    )
    return replace(base, **overrides)


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return make_settings(tmp_path)
