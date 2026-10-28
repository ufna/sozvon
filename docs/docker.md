# Run sozvon with Docker

One image contains the web client, API/P2P signaling, pinned patched LiveKit SFU
and Caddy HTTPS proxy. It needs no Node.js installation, source checkout,
database or manual key generation. Linux x86-64 is the tested platform.

## Try it locally

```bash
docker run -d --name sozvon --init --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -p 7881:7881/tcp -p 7882:7882/udp \
  -v sozvon-data:/data \
  ghcr.io/ufna/sozvon:latest
```

Open **http://localhost:8080**. Create a room and open it in a second browser
profile. Localhost permits microphone/camera access over HTTP; other devices
need a publicly reachable HTTPS instance.

Independent random API and signaling credentials are generated on the first
start and retained in `sozvon-data`. Reusing the volume preserves credentials
and certificate state across container replacements. No credentials are baked
into the published image.

## Deploy on a server

Point a domain's DNS to your server. Provide its reachable media IP. The server
needs incoming **80/TCP**, **443/TCP**, **7881/TCP** and **7882/UDP**. RTC ports
must reach this Docker host directly; an ordinary HTTP reverse proxy does not
forward that media traffic.

```bash
docker run -d --name sozvon --init --restart unless-stopped \
  -e PUBLIC_URL=https://calls.example.com \
  -e PUBLIC_IP=203.0.113.10 \
  -p 80:8080 -p 443:8443 \
  -p 7881:7881/tcp -p 7882:7882/udp \
  -v sozvon-data:/data \
  ghcr.io/ufna/sozvon:latest
```

Replace the example domain and IP with your own. Caddy obtains and renews the
certificate automatically; keep ports 80/443 reachable for validation and
HTTPS. Keep the DNS record direct rather than behind a generic HTTP CDN.
If the host has IPv6 DNS records, those must reach the same instance too.

`PUBLIC_IP` may be omitted on a directly reachable server that permits SFU
external-address discovery. Set it explicitly behind NAT or on a machine with
several interfaces, and forward the same RTC port numbers through the router.

## Docker Compose

The Compose definition is in the source repository **and inside the image**, so
it can be obtained without cloning the repository:

```bash
docker run --rm --entrypoint cat ghcr.io/ufna/sozvon:latest \
  /usr/share/doc/sozvon/compose.selfhost.yaml > compose.yaml
docker compose up -d
```

Defaults expose HTTP only on the local machine. For a public server, put this in
`.env` alongside `compose.yaml`:

```dotenv
PUBLIC_URL=https://calls.example.com
PUBLIC_IP=203.0.113.10
HTTP_BIND=0.0.0.0:80
HTTPS_BIND=0.0.0.0:443
```

Then run `docker compose up -d`. The Compose configuration runs as a non-root
user with a read-only image filesystem, a writable data volume and bounded logs.
The Telegram bot is optional and stays separate; it is not started by this image.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PUBLIC_URL` | `http://localhost:8080` | Browser-facing origin; a public host requires HTTPS. |
| `PUBLIC_IP` | Automatic for public hosts | Reachable media IP; localhost defaults to loopback. |
| `RTC_TCP_PORT` | `7881` | SFU TCP fallback; publish/forward the same port. |
| `RTC_UDP_PORT` | `7882` | SFU UDP media; publish/forward the same port. |

The browser uses relative API/signaling URLs. LiveKit URLs and link-preview
origins are derived from `PUBLIC_URL`, so changing the domain requires no rebuild.
Only the HTTP proxy and RTC listeners are published; API and SFU control services
remain internal. Health checks verify that the API can authenticate to the SFU.

Networks that block both RTC ports may require a separate TURN service. This
initial simple package does not include a TURN/TLS endpoint. See
[self-hosting](self-hosting.md) for independent component deployment and ICE
configuration. The packaged media test covers direct SFU and P2P calls; it does
not certify every firewall/NAT combination.

## Updates and backups

`latest` follows the tested main branch. Numbered versions such as `0.101`
match the version shown in the browser title. The full source revision is also an
image tag for reproducible deployments; use that tag or an immutable digest to
pin an installation. With Compose, set `SOZVON_IMAGE` to that full reference.

```bash
docker compose pull
docker compose up -d
```

Updates replace the bundled SFU and interrupt calls, so schedule them between
meetings. The maintained production instance uses separate component images
for independent rollouts.

Back up the data volume: it holds generated credentials and HTTPS private keys.
`docker compose down` retains it; `docker compose down -v` deletes it. Protect
backups as credentials. There is no account database or recording store in the
bundle. Docker/host administrators can access its runtime secrets.

To build instead of pulling: `docker build -t sozvon:local .` from the repository
root. Third-party license texts ship under `/usr/share/doc/sozvon/licenses/`.
