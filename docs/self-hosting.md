# Self-hosting

sozvon has a browser client, Node.js API/signaling service, separate LiveKit SFU
and optional Telegram bot. The checked-in Compose file starts the local SFU;
it is not a complete production deployment.

## Local development

Requirements: Node 24, npm, Docker and Docker Compose on Linux. Host networking
and loopback RTC configuration assume the browser runs on that machine.

```bash
npm run install:apps
npm run setup:local
docker compose up -d --build sfu
npm run dev:server
# In another terminal, from the repository root:
npm run dev:client
```

Open http://localhost:4000. API health is at http://localhost:4001/healthz;
http://localhost:4001/readyz checks SFU authentication and availability.

The setup script generates independent random `LIVE_SECRET` and
`SIGNALING_SECRET` values in `apps/server/.env`, and matching LiveKit configuration
in `.local/livekit.yaml`. Both are ignored by Git. Keep the two configurations
in sync. Setup refuses to replace either existing file. The API env file is
owner-readable; the SFU file lives inside an owner-only directory and is readable
by the unprivileged container through its bind mount.

Stop the SFU with `docker compose down`. Keep generated files to reuse your local
configuration; do not copy these loopback settings to a public deployment.

## API configuration

Set values in `apps/server/.env` for native development, or inject them into the
API container. Never put secrets in client build arguments.

| Variable | Purpose |
| --- | --- |
| `DEV_MODE` | `true` for local HTTP/WS; `false` for production. |
| `BIND_ADDRESS`, `PORT` | API listener; defaults to `127.0.0.1:4001`. Use `0.0.0.0` inside a container that needs published ports. |
| `ALLOWED_ORIGINS` | Comma-separated client HTTP(S) origins. Set explicitly for your deployment. |
| `LIVE_KEY`, `LIVE_SECRET` | LiveKit API credentials; must match the SFU. Secret requires at least 32 characters. |
| `LIVEKIT_SERVER_URL` | SFU HTTP(S) API address reachable from the API service. |
| `LIVEKIT_URL` | Public WebSocket URL reachable from participant browsers; production requires WSS. |
| `SIGNALING_SECRET` | Independent random secret of at least 32 characters for P2P JWTs. |
| `HOST`, `VERSION` | Host fallback for the LiveKit URL and a diagnostic version label. |

## Client configuration

These variables are read **at build time**. Changing container runtime variables
does not change a previously built client. HTTP and WebSocket base URLs include
a trailing slash.

| Variable | Purpose |
| --- | --- |
| `SERVER_URL` | Browser-reachable API base URL, such as `https://api.example.com/`. |
| `SERVER_WS_URL` | Browser-reachable signaling base URL, such as `wss://api.example.com/`. |
| `DEV_MODE` | Set explicitly to `false` for a production build. |
| `ICE_SERVERS` | JSON array of STUN/TURN server entries for P2P; choose providers and credentials appropriate to your deployment. |
| `VERSION` | Build version label. |

Client ICE configuration is delivered to browsers and is visible to participants.
Use temporary, scoped TURN credentials where supported by your deployment;
never embed an administrative secret in this build configuration.

## Build contexts

Run from the repository root:

```bash
docker build -t sozvon-api:local apps/server
docker build -t sozvon-sfu:local -f apps/server/Dockerfile.livekit apps/server
docker build -t sozvon-client:local \
  --build-arg SERVER_URL=https://api.example.com/ \
  --build-arg SERVER_WS_URL=wss://api.example.com/ \
  --build-arg DEV_MODE=false apps/client
docker build -t sozvon-bot:local apps/bot
```

The SFU build verifies a pinned upstream source archive and uses checked-in Go
module overrides. The API container starts as an unprivileged user. Supply a
runtime environment separately; no production configuration is included here.

## Public deployment

Provide HTTPS for the client/API and WSS for signaling and SFU connections.
Configure the reverse proxy to forward WebSocket upgrades, and make SFU RTC
addresses and TCP/UDP ports reachable from participant networks. Networks that
cannot connect directly may need a TURN service. The local SFU's loopback node
address and local-only bind addresses must be replaced for remote participants.

Use explicit CORS origins and matching API/SFU credentials. Review the client's
Open Graph metadata and link-preview origin in `index.html` and the asset
generator before deploying under another domain. The application name and mark
remain sozvon / Zov on every hostname.

Use `/readyz` to check the API-to-SFU connection before routing traffic. Deploy
API and SFU updates independently: replacing an SFU can interrupt ongoing calls.
Keep immutable image digests, backups, rollout and rollback procedures in your
private infrastructure repository. No automatic production deployment runs from
this repository at this preparation stage.

For Telegram invitations, see [bot setup](../apps/bot/README.md).
For trust boundaries, see [architecture](architecture.md) and [security](../SECURITY.md).
