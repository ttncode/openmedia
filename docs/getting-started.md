# Getting started

## Requirements

- Docker 24 or newer with the Compose plugin, or
- [mise](https://mise.jdx.dev) to run OpenMedia from source

## Install with Docker Compose

Download `compose.yaml` and `example.env` from the
[latest release](https://github.com/ttncode/openmedia/releases/latest):

```bash
curl -fsSLO https://github.com/ttncode/openmedia/releases/latest/download/compose.yaml
curl -fsSLO https://github.com/ttncode/openmedia/releases/latest/download/example.env
cp example.env .env
```

Edit `.env` and set `OPENMEDIA_PASSWORD` to a password of your own. The API
refuses to start while it is still the placeholder `changeme`. Leaving it
empty turns sign-in off, which is only safe for a private local instance; see
[Security](/security) for why. Then start the stack:

```bash
docker compose up -d
```

Open `http://localhost:8080` and sign in with that password. The web UI runs
on `WEB_PORT` (default 8080); the API runs on `127.0.0.1:${API_PORT}` (default 8081) and is not reachable from outside the host.

The [installer script](https://github.com/ttncode/openmedia/releases/latest/download/install.sh)
does all of this for you, generates a random password and prints it when it
finishes. See [Configuration](/configuration) for every variable.

## First download

1. Paste a link into the field at the top and press Enter, or click
   **Get info**.
2. Pick a format and quality in the details panel.
3. Click **Download**. The queue shows progress; when it finishes, click
   **Save** to save the file to your device.

## Updating

```bash
docker compose pull
docker compose up -d
```

This pulls the newest image for the tag set in `IMAGE_TAG` (`latest` by
default) and recreates the containers. Downloaded files in the `/data` volume
are untouched.
