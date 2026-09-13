import os
from pathlib import Path

PRIVATE_FILE_MODE = 0o600


def write_private_text(path: Path, text: str) -> None:
    descriptor = os.open(
        path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, PRIVATE_FILE_MODE
    )
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        handle.write(text)
