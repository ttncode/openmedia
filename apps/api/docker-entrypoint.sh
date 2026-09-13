#!/bin/sh
set -eu

data_dir="${OPENMEDIA_DATA_DIR:-/data}"
mkdir -p "$data_dir/downloads"

if [ "${OPENMEDIA_AUTO_UPDATE_YTDLP:-true}" = "true" ]; then
  echo "openmedia: updating yt-dlp in $data_dir/yt-dlp"
  if ! uv pip install --quiet --python /app/.venv/bin/python --target "$data_dir/yt-dlp" --upgrade "yt-dlp[default]"; then
    echo "openmedia: yt-dlp update failed, using the bundled version"
  fi
fi

exec "$@"
