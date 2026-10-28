# Development

Use Node 24 (`.nvmrc`) and install the exact package locks:

```bash
npm run install:apps
```

The applications have separate package locks and build contexts. Root scripts
forward commands to the appropriate package; this is not an npm workspace setup.

| Directory | Responsibility |
| --- | --- |
| `apps/client` | React, MobX, Tailwind and Vite browser client; Playwright tests. |
| `apps/server` | Express API, JWT room tokens and WebSocket P2P signaling. |
| `apps/server/sfu` | Go module overrides for the pinned LiveKit server build. |
| `apps/bot` | grammY Telegram bot, configuration and locale tests. |
| `scripts` | Local configuration setup and README capture. |
| `docs/assets` | Shared mark and screenshots used by repository documentation. |

## Local work

Follow [self-hosting](self-hosting.md#local-development) for the API and SFU.
`npm run dev:client` starts Vite on loopback port 4000; `npm run dev:server`
starts the API on port 4001. `npm run dev:bot` needs a separate bot token and
updates that bot's Telegram profile when started. Use a development bot.

`/design` previews the home screen, lobby, meeting and mobile views with local
synthetic data. It does not join a server or request microphone/camera access.
`/design?embed=1&theme=studio&view=call` is the meeting view without review navigation.

## Checks

```bash
npm run lint
npm run test:server
npm run test:bot
npm run build
cd apps/client
npx playwright install --with-deps chromium webkit
npm run test:smoke
npm run test:integration
```

The smoke suite covers Chromium and WebKit. Integration requires Docker and
runs Chromium with synthetic microphone/camera devices against an isolated SFU
and token fixture on loopback ports 14001/17880/17881/17882. It checks two
participants, media, chat, screen sharing and reconnection; P2P is skipped by
that fixture because it does not implement signaling.

To check both modes against your own **local** API and SFU, start them, then:

```bash
cd apps/client
npm run build
TEST_MEDIA=1 TEST_P2P=1 npx playwright test tests/media.spec.js --project=chromium
```

This uses the client's default local API addresses. Custom `SERVER_URL` and
`SERVER_WS_URL` values must be supplied when building. Browser tests use port
4000 by default; stop an unrelated server on that port to avoid testing old code.

## Packaged distribution

The root Dockerfile builds the single-image self-hosted distribution. It has no
production configuration. Its entrypoint generates per-installation secrets in
`/data` and starts API, SFU and HTTPS proxy together. Node tests validate its
configuration; the media test exercises the actual container through published
HTTP/RTC ports and checks key persistence after a restart.

```bash
node --test docker/config.test.mjs
docker build -t sozvon-selfhost:test .
bash scripts/test-selfhost.sh
```

CI exports the exact tested image and publishes it as `ghcr.io/ufna/sozvon` with
revision and `latest` tags. It does not rebuild the image in the publication job.
Only the self-hosted distribution bundles the SFU lifecycle with the application.
See [Docker deployment](docker.md).

## Secrets and source review

```bash
gitleaks git . --config .gitleaks.toml --redact
gitleaks dir /path/to/clean-source-export --config "$PWD/.gitleaks.toml" --redact
```

Use a clean source export for the directory scan; a working development folder
contains intentionally generated local credentials that the scanner should flag.
CI scans full Git history with Gitleaks 8.30.1. The exact public loopback fixture
credential is the only configured exception. Never add broad exclusions for
source directories, tests or dependency files. Inspect image contents as well as
text before publishing assets. Keep production configuration in private ops.

See [CONTRIBUTING](../CONTRIBUTING.md) and [security reporting](../SECURITY.md).
