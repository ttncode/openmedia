# Deployment

## Topology

`compose.yaml` runs two services. `web` publishes `WEB_PORT` (default 8080)
on every interface; it is the only port meant to be reached from outside the
host. `api` publishes `API_PORT` (default 8081) bound to `127.0.0.1` only,
so the API is never reachable directly, even on a shared host. The web app's
own server proxies `/api/*` requests to the API at runtime; the browser never
talks to the API origin.

Downloads, cookies, the generated secret key and runtime settings live in the
`openmedia-data` named volume, mounted at `/data` in the `api` container.

## Reverse proxy

Put your own TLS-terminating reverse proxy in front of `WEB_PORT`; OpenMedia
does not choose one for you.

Caddy:

```
openmedia.example.com {
  reverse_proxy localhost:8080
}
```

nginx:

```nginx
location / {
  proxy_pass http://localhost:8080;
  proxy_set_header X-Forwarded-For $remote_addr;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Host $host;
}
```

`OPENMEDIA_TRUSTED_PROXY_HOPS` (default `1`) tells the API how many
`X-Forwarded-*` hops to trust when reading the client's real address, used
for rate limiting and the cross-site guard. Set it to the number of proxies
between the browser and the `web` container: `1` for a single reverse proxy
in front of Compose, `0` if the API is reached directly (no proxy at all),
higher if you chain more than one proxy. A value too low reads a proxy's own
address as the client's; a value too high reads a spoofable header as if a
trusted proxy set it.

## Backups

Back up the `openmedia-data` volume (or whatever host path it is bound to)
to preserve cookies, the generated secret key and runtime settings across
reinstalls. Downloaded media files are deleted automatically once their
retention period elapses, so they are not worth including in a backup
schedule.

## yt-dlp updates

`OPENMEDIA_AUTO_UPDATE_YTDLP` (default `true`) installs the newest `yt-dlp`
into the data volume on every container start, ahead of the version locked
into the image. Set it to `false` to pin the image's bundled version, for
example on a host with no outbound internet access.

## Publishing

`.github/workflows/build.yml` publishes `main` and `sha-<commit>` tags on
every push to `main`. `.github/workflows/release.yml` additionally publishes
semver tags (`1.4.0`, `1.4`) plus `latest` when a release is cut. Both build
the same images; they differ only in which tags name them.

`compose.yaml` and `example.env` are attached to every GitHub Release, so a
deployment target always fetches a matching pair rather than whatever is on
`main`. `install.sh` downloads both, starts the stack, and never touches an
existing `.env`.

## If this project is private

A private project needs a token, and it needs it for two separate reasons:
a token carrying only one of the two scopes fails in only one of the two
places.

```sh
GITHUB_TOKEN=ghp_... bash install.sh
```

- **`repo`**, to download the release assets. A private release's browser
  download URL returns 404 _even with a token attached_, so `install.sh`
  fetches assets through the GitHub API instead.
- **`read:packages`**, to pull the image. A package's visibility on ghcr is
  separate from its repository's, so a private package refuses an anonymous
  pull with `unauthorized` even when the repository is public.

`jq` is required on the host for this path only. A public project needs
neither the token nor `jq`.

## Two delivery modes, one pipeline

They differ only in which `IMAGE_TAG` the deployment sets.

|              | Client operates the host     | Author operates the host |
| ------------ | ---------------------------- | ------------------------ |
| `IMAGE_TAG`  | `1.4.0`, pinned deliberately | `main`, moving           |
| Upgrades     | The client chooses when      | Every merge              |
| `install.sh` | Handed to the client         | Used by the author       |
