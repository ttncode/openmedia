import json
import os
import subprocess
import sys
import tempfile
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import Settings
from .errors import ApiError
from .progress import PROGRESS_MARKER
from .validation import DownloadOptions

PROGRESS_TEMPLATE = (
    f"download:{PROGRESS_MARKER} %(progress.downloaded_bytes)s %(progress.total_bytes)s "
    "%(progress.total_bytes_estimate)s %(progress.speed)s %(progress.eta)s"
)
MEDIA_OUTPUT_TEMPLATE = "media.%(ext)s"
INFO_TIMEOUT_SECONDS = 60.0
PLAYLIST_TIMEOUT_SECONDS = 90.0
MAX_ERROR_MESSAGE_LENGTH = 300
ERROR_PATTERNS = (
    (
        "sign in to confirm",
        "bot_check",
        "The site asked to confirm you are not a bot. Add cookies and try again.",
    ),
    ("private video", "private_video", "This video is private."),
    (
        "available in your country",
        "geo_blocked",
        "This video is not available in the server's region.",
    ),
    ("video unavailable", "unavailable", "This video is unavailable."),
    ("unsupported url", "unsupported_url", "This link is not supported."),
    (
        "larger than max-filesize",
        "too_large",
        "The file is larger than the configured size limit.",
    ),
)


@dataclass(frozen=True)
class CompletedRun:
    returncode: int
    stdout: str
    stderr: str


Runner = Callable[[Sequence[str], float, Mapping[str, str]], CompletedRun]
CookieCopier = Callable[[Path], Path | None]


@dataclass(frozen=True)
class DownloadRequest:
    url: str
    options: DownloadOptions
    job_dir: Path
    max_filesize_mb: int
    cookies_file: Path | None
    proxy: str


def run_command(
    command: Sequence[str], timeout: float, env: Mapping[str, str]
) -> CompletedRun:
    try:
        result = subprocess.run(
            list(command),
            capture_output=True,
            text=True,
            timeout=timeout,
            env=dict(env),
            check=False,
        )
    except subprocess.TimeoutExpired as error:
        raise ApiError(
            504, "timeout", "The site took too long to respond. Try again."
        ) from error
    return CompletedRun(result.returncode, result.stdout, result.stderr)


def base_command() -> list[str]:
    return [sys.executable, "-m", "yt_dlp"]


def ytdlp_environment(settings: Settings) -> dict[str, str]:
    environment = dict(os.environ)
    if (settings.ytdlp_dir / "yt_dlp").is_dir():
        paths = [str(settings.ytdlp_dir), environment.get("PYTHONPATH", "")]
        environment["PYTHONPATH"] = os.pathsep.join(path for path in paths if path)
    return environment


def _network_arguments(cookies_file: Path | None, proxy: str) -> list[str]:
    cookies = ["--cookies", str(cookies_file)] if cookies_file is not None else []
    return [*cookies, *(["--proxy", proxy] if proxy else [])]


def _seconds(value: float) -> str:
    return f"{value:g}"


def _video_arguments(options: DownloadOptions) -> list[str]:
    if options.format_id:
        selector = (
            f"{options.format_id}+bestaudio[ext=m4a]/{options.format_id}+bestaudio/best"
        )
    elif options.quality_height:
        height = options.quality_height
        selector = f"bv*[height<={height}]+ba/b[height<={height}]/b"
    else:
        selector = "bv*+ba/b"
    sorting = ["-S", "vcodec:h264,acodec:aac"] if options.container == "mp4" else []
    return [
        "-f",
        selector,
        *sorting,
        "--merge-output-format",
        options.container,
        "--remux-video",
        options.container,
    ]


def _audio_arguments(options: DownloadOptions) -> list[str]:
    quality = "320K" if options.audio_quality == "320k" else "0"
    return [
        "-f",
        "ba/b",
        "-x",
        "--audio-format",
        options.audio_format or "mp3",
        "--audio-quality",
        quality,
    ]


def _trim_arguments(options: DownloadOptions) -> list[str]:
    if options.trim is None:
        return []
    section = f"*{_seconds(options.trim.start)}-{_seconds(options.trim.end)}"
    return ["--download-sections", section, "--force-keyframes-at-cuts"]


def _subtitle_arguments(options: DownloadOptions) -> list[str]:
    if options.subtitles is None:
        return []
    delivery = (
        ["--embed-subs"]
        if options.subtitles.mode == "embed"
        else ["--convert-subs", "srt"]
    )
    return [
        "--write-subs",
        "--write-auto-subs",
        "--sub-langs",
        ",".join(options.subtitles.languages),
        *delivery,
    ]


def _metadata_arguments(options: DownloadOptions) -> list[str]:
    if not options.embed_metadata:
        return []
    thumbnail = [] if options.audio_format == "wav" else ["--embed-thumbnail"]
    return ["--embed-metadata", "--embed-chapters", *thumbnail]


def build_download_command(request: DownloadRequest) -> list[str]:
    options = request.options
    selection = (
        _audio_arguments(options)
        if options.kind == "audio"
        else _video_arguments(options)
    )
    return [
        *base_command(),
        "--no-playlist",
        "--newline",
        "--no-colors",
        "--no-warnings",
        "--progress",
        "--progress-template",
        PROGRESS_TEMPLATE,
        "--max-filesize",
        f"{request.max_filesize_mb}M",
        "-P",
        str(request.job_dir),
        "-o",
        MEDIA_OUTPUT_TEMPLATE,
        *selection,
        *_trim_arguments(options),
        *_subtitle_arguments(options),
        *_metadata_arguments(options),
        *_network_arguments(request.cookies_file, request.proxy),
        "--",
        request.url,
    ]


def build_info_command(url: str, cookies_file: Path | None, proxy: str) -> list[str]:
    return [
        *base_command(),
        "-J",
        "--no-playlist",
        "--no-warnings",
        *_network_arguments(cookies_file, proxy),
        "--",
        url,
    ]


def build_playlist_command(
    url: str, limit: int, cookies_file: Path | None, proxy: str
) -> list[str]:
    return [
        *base_command(),
        "-J",
        "--flat-playlist",
        "--playlist-end",
        str(limit),
        "--no-warnings",
        *_network_arguments(cookies_file, proxy),
        "--",
        url,
    ]


def _last_line(output: str) -> str:
    lines = [line.strip() for line in output.splitlines() if line.strip()]
    return lines[-1] if lines else "yt-dlp failed without output"


def error_from_output(output: str) -> ApiError:
    line = _last_line(output)
    lowered = line.lower()
    for fragment, code, message in ERROR_PATTERNS:
        if fragment in lowered:
            return ApiError(400, code, message)
    detail = line.removeprefix("ERROR:").strip()[:MAX_ERROR_MESSAGE_LENGTH]
    return ApiError(400, "extractor_error", detail)


def first_json_document(stdout: str) -> dict[str, Any]:
    for candidate in (stdout, *stdout.splitlines()):
        try:
            document = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(document, dict):
            return document
    raise ApiError(502, "extractor_error", "yt-dlp returned no data.")


def _best_formats_by_height(
    formats: Sequence[Mapping[str, Any]],
) -> list[dict[str, object]]:
    best: dict[int, Mapping[str, Any]] = {}
    for entry in formats:
        height = entry.get("height")
        if not isinstance(height, int) or entry.get("vcodec", "none") == "none":
            continue
        if height not in best or (entry.get("tbr") or 0) > (
            best[height].get("tbr") or 0
        ):
            best[height] = entry
    return [
        {
            "id": str(entry["format_id"]),
            "label": f"{height}p",
            "height": height,
            "ext": entry.get("ext"),
            "filesize": entry.get("filesize") or entry.get("filesize_approx"),
        }
        for height, entry in sorted(best.items(), reverse=True)
    ]


def summarize_info(info: Mapping[str, Any]) -> dict[str, object]:
    return {
        "id": info.get("id"),
        "title": info.get("title") or "",
        "thumbnail": info.get("thumbnail") or "",
        "duration": info.get("duration"),
        "uploader": info.get("uploader") or info.get("channel") or "",
        "platform": info.get("extractor_key") or "",
        "webpage_url": info.get("webpage_url") or "",
        "formats": _best_formats_by_height(info.get("formats") or []),
        "subtitle_languages": sorted((info.get("subtitles") or {}).keys()),
        "has_chapters": bool(info.get("chapters")),
    }


class YtDlpClient:
    def __init__(
        self,
        settings: Settings,
        copy_cookies: CookieCopier,
        runner: Runner = run_command,
    ) -> None:
        self._settings = settings
        self._copy_cookies = copy_cookies
        self._runner = runner

    def _run(
        self, build: Callable[[Path | None], list[str]], timeout: float
    ) -> dict[str, Any]:
        with tempfile.TemporaryDirectory(prefix="openmedia-") as workdir:
            command = build(self._copy_cookies(Path(workdir)))
            result = self._runner(command, timeout, ytdlp_environment(self._settings))
        if result.returncode != 0:
            raise error_from_output(result.stderr)
        return first_json_document(result.stdout)

    def fetch_info(self, url: str) -> dict[str, object]:
        proxy = self._settings.ytdlp_proxy
        document = self._run(
            lambda cookies: build_info_command(url, cookies, proxy),
            INFO_TIMEOUT_SECONDS,
        )
        return summarize_info(document)

    def fetch_playlist(self, url: str, limit: int) -> dict[str, object]:
        proxy = self._settings.ytdlp_proxy
        document = self._run(
            lambda cookies: build_playlist_command(url, limit, cookies, proxy),
            PLAYLIST_TIMEOUT_SECONDS,
        )
        entries = document.get("entries") or []
        urls = [
            str(entry.get("url") or entry.get("webpage_url"))
            for entry in entries
            if entry.get("url") or entry.get("webpage_url")
        ]
        return {
            "title": document.get("title") or "",
            "count": len(urls[:limit]),
            "urls": urls[:limit],
        }
