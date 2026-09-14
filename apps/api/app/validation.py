import re
from collections.abc import Mapping
from dataclasses import asdict, dataclass
from urllib.parse import urlsplit

from .errors import ApiError

MAX_URL_LENGTH = 2048
FORMAT_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.+-]{1,64}$")
LANGUAGE_PATTERN = re.compile(r"^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$")
UNSAFE_URL_CHARACTERS = re.compile(r"[\s\x00-\x1f\x7f]")
MAX_SUBTITLE_LANGUAGES = 5
KINDS = ("video", "audio")
CONTAINERS = ("mp4", "mkv")
AUDIO_FORMATS = ("mp3", "m4a", "opus", "flac", "wav")
AUDIO_QUALITIES = ("320k", "best")
SUBTITLE_MODES = ("embed", "srt")
MAX_QUALITY_HEIGHT = 8640


@dataclass(frozen=True)
class Trim:
    start: float
    end: float


@dataclass(frozen=True)
class SubtitleOptions:
    languages: tuple[str, ...]
    mode: str


@dataclass(frozen=True)
class DownloadOptions:
    kind: str
    container: str
    quality_height: int | None
    format_id: str | None
    audio_format: str | None
    audio_quality: str | None
    trim: Trim | None
    subtitles: SubtitleOptions | None
    embed_metadata: bool

    def to_json(self) -> dict[str, object]:
        data = asdict(self)
        if self.subtitles is not None:
            data["subtitles"] = {
                "languages": list(self.subtitles.languages),
                "mode": self.subtitles.mode,
            }
        return data


def invalid_option(message: str) -> ApiError:
    return ApiError(400, "invalid_option", message)


def validate_url(value: object) -> str:
    if not isinstance(value, str):
        raise ApiError(
            400, "invalid_url", "Provide a link that starts with http:// or https://."
        )
    url = value.strip()
    parts = urlsplit(url)
    is_valid = (
        len(url) <= MAX_URL_LENGTH
        and parts.scheme in ("http", "https")
        and bool(parts.hostname)
        and not UNSAFE_URL_CHARACTERS.search(url)
    )
    if not is_valid:
        raise ApiError(
            400, "invalid_url", "Provide a link that starts with http:// or https://."
        )
    return url


def _choice(
    payload: Mapping[str, object], key: str, choices: tuple[str, ...], default: str
) -> str:
    value = payload.get(key) or default
    if value not in choices:
        raise invalid_option(f"{key} must be one of {', '.join(choices)}.")
    return str(value)


def _format_id(payload: Mapping[str, object]) -> str | None:
    value = payload.get("format_id")
    if value in (None, ""):
        return None
    if not isinstance(value, str) or not FORMAT_ID_PATTERN.fullmatch(value):
        raise invalid_option("format_id is not a valid format identifier.")
    return value


def _quality_height(payload: Mapping[str, object]) -> int | None:
    value = payload.get("quality_height")
    if value is None:
        return None
    if (
        not isinstance(value, int)
        or isinstance(value, bool)
        or not 1 <= value <= MAX_QUALITY_HEIGHT
    ):
        raise invalid_option(
            f"quality_height must be a whole number from 1 to {MAX_QUALITY_HEIGHT}."
        )
    return value


def _number(value: object, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise invalid_option(f"trim.{name} must be a number of seconds.")
    return float(value)


def _trim(payload: Mapping[str, object]) -> Trim | None:
    value = payload.get("trim")
    if value is None:
        return None
    if not isinstance(value, Mapping):
        raise invalid_option("trim must be an object with start and end.")
    start, end = _number(value.get("start"), "start"), _number(value.get("end"), "end")
    if start < 0 or start >= end:
        raise invalid_option("trim.start must be at least 0 and before trim.end.")
    return Trim(start=start, end=end)


def _subtitles(payload: Mapping[str, object]) -> SubtitleOptions | None:
    value = payload.get("subtitles")
    if value is None:
        return None
    if not isinstance(value, Mapping) or not isinstance(value.get("languages"), list):
        raise invalid_option("subtitles must contain a languages list.")
    languages = tuple(value["languages"])
    valid = 0 < len(languages) <= MAX_SUBTITLE_LANGUAGES and all(
        isinstance(language, str) and LANGUAGE_PATTERN.fullmatch(language)
        for language in languages
    )
    if not valid:
        raise invalid_option(
            "subtitles.languages must hold one to five language codes."
        )
    return SubtitleOptions(
        languages=languages, mode=_choice(value, "mode", SUBTITLE_MODES, "embed")
    )


def _embed_metadata(payload: Mapping[str, object]) -> bool:
    value = payload.get("embed_metadata", True)
    if not isinstance(value, bool):
        raise invalid_option("embed_metadata must be true or false.")
    return value


def parse_download_options(payload: Mapping[str, object]) -> DownloadOptions:
    kind = _choice(payload, "format", KINDS, "video")
    is_audio = kind == "audio"
    return DownloadOptions(
        kind=kind,
        container=_choice(payload, "container", CONTAINERS, "mp4"),
        quality_height=None if is_audio else _quality_height(payload),
        format_id=None if is_audio else _format_id(payload),
        audio_format=_choice(payload, "audio_format", AUDIO_FORMATS, "mp3")
        if is_audio
        else None,
        audio_quality=_choice(payload, "audio_quality", AUDIO_QUALITIES, "best")
        if is_audio
        else None,
        trim=_trim(payload),
        subtitles=None if is_audio else _subtitles(payload),
        embed_metadata=_embed_metadata(payload),
    )
