import shutil
from dataclasses import asdict, dataclass
from pathlib import Path

from .errors import ApiError

BYTES_PER_GIGABYTE = 1024**3


@dataclass(frozen=True)
class StorageUsage:
    used_bytes: int
    limit_bytes: int | None
    free_bytes: int

    def to_json(self) -> dict[str, int | None]:
        return asdict(self)


def directory_size(path: Path) -> int:
    if not path.is_dir():
        return 0
    return sum(entry.stat().st_size for entry in path.rglob("*") if entry.is_file())


def _free_bytes(path: Path) -> int:
    existing = path if path.exists() else path.parent
    return shutil.disk_usage(existing).free


def storage_usage(downloads_dir: Path, max_storage_gb: int) -> StorageUsage:
    limit = max_storage_gb * BYTES_PER_GIGABYTE if max_storage_gb > 0 else None
    return StorageUsage(
        used_bytes=directory_size(downloads_dir),
        limit_bytes=limit,
        free_bytes=_free_bytes(downloads_dir),
    )


def ensure_capacity(usage: StorageUsage) -> None:
    if usage.limit_bytes is not None and usage.used_bytes >= usage.limit_bytes:
        raise ApiError(
            507,
            "storage_full",
            "Server storage is full. Remove finished downloads or raise the limit.",
        )
