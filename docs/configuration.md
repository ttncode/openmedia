# Configuration

All variables are set in `.env`, next to `compose.yaml`. `example.env` lists
every one with its default.

## Compose

| Variable    | Default  | Meaning                                                      |
| ----------- | -------- | ------------------------------------------------------------ |
| `IMAGE_TAG` | `latest` | Image tag pulled for both services                           |
| `WEB_PORT`  | `8080`   | Host port the web UI is published on                         |
| `API_PORT`  | `8081`   | Host port the API is published on, bound to `127.0.0.1` only |

## API URL (source builds only)

| Variable  | Default                 | Meaning                                                    |
| --------- | ----------------------- | ---------------------------------------------------------- |
| `API_URL` | `http://localhost:8081` | Where the web app's server-side proxy forwards `/api/*` to |

In the Compose stack, `API_URL` is set for you (`http://api:8080`, the
service name and container port) and does not need to be in `.env`. It only
matters when running `apps/web` from source against a separately running API.

## Application settings

| Variable                          | Default   | Meaning                                                                 |
| --------------------------------- | --------- | ----------------------------------------------------------------------- |
| `OPENMEDIA_DATA_DIR`              | `/data`   | Root for downloads, cookies, settings, secret key, yt-dlp updates       |
| `OPENMEDIA_PASSWORD`              | empty     | When set, every API route except session and health needs a login       |
| `OPENMEDIA_SECRET_KEY`            | generated | Session signing key; generated once into the data dir when empty        |
| `OPENMEDIA_RETENTION_MINUTES`     | `60`      | Default retention; the runtime setting below overrides it               |
| `OPENMEDIA_MAX_CONCURRENT`        | `3`       | Default concurrent downloads (1 to 5); the runtime setting overrides it |
| `OPENMEDIA_MAX_FILESIZE_MB`       | `4096`    | Passed to yt-dlp as `--max-filesize`                                    |
| `OPENMEDIA_MAX_STORAGE_GB`        | `0`       | Total download storage limit; `0` means unlimited                       |
| `OPENMEDIA_MAX_PLAYLIST_ITEMS`    | `50`      | Upper bound for playlist expansion                                      |
| `OPENMEDIA_RATE_LIMIT_PER_MINUTE` | `120`     | Per client, for info, playlist and download requests                    |
| `OPENMEDIA_STALL_TIMEOUT_SECONDS` | `180`     | A download with no output for this long is stopped                      |
| `OPENMEDIA_ALLOW_PRIVATE_URLS`    | `false`   | Allows URLs that resolve to private networks                            |
| `OPENMEDIA_TRUSTED_PROXY_HOPS`    | `1`       | Number of `X-Forwarded-*` hops trusted (the web proxy)                  |
| `OPENMEDIA_AUTO_UPDATE_YTDLP`     | `true`    | Container start installs the newest yt-dlp into the data dir            |
| `OPENMEDIA_YTDLP_PROXY`           | empty     | Optional proxy passed to yt-dlp                                         |

Set `OPENMEDIA_PASSWORD` before exposing an instance beyond your own network.
See [Security](/security) for what it protects and what it does not.

## Runtime settings

Retention and concurrency can also be changed from **Settings** in the web
UI, without restarting the container. A change made there is saved to
`settings.json` in the data directory and overrides
`OPENMEDIA_RETENTION_MINUTES` and `OPENMEDIA_MAX_CONCURRENT` until changed
again. Retention accepts 15, 60, 360 or 1440 minutes; concurrency accepts 1
to 5.
