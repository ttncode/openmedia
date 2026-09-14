#!/bin/sh
set -eu

data_dir="${OPENMEDIA_DATA_DIR:-/data}"
ytdlp_dir="$data_dir/yt-dlp"
update_timeout_seconds=120
mkdir -p "$data_dir/downloads"
rm -rf "$data_dir"/.yt-dlp.*

update_ytdlp() {
  staging_dir="$(mktemp -d "$data_dir/.yt-dlp.XXXXXX")"
  if timeout "$update_timeout_seconds" uv pip install --quiet --python /app/.venv/bin/python --target "$staging_dir" --upgrade "yt-dlp[default]"; then
    rm -rf "$ytdlp_dir"
    mv "$staging_dir" "$ytdlp_dir" && return 0
  fi
  rm -rf "$staging_dir"
  return 1
}

auto_update="$(printf '%s' "${OPENMEDIA_AUTO_UPDATE_YTDLP:-true}" | tr '[:upper:]' '[:lower:]')"
case "$auto_update" in
  1 | true | yes | on)
    echo "openmedia: updating yt-dlp in $ytdlp_dir"
    if ! update_ytdlp; then
      echo "openmedia: yt-dlp update failed, using the bundled version"
      rm -rf "$ytdlp_dir"
    fi
    ;;
  *)
    rm -rf "$ytdlp_dir"
    ;;
esac

exec "$@"
