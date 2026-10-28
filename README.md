# sozvon

Self-hosted video meetings: React browser client, Node.js API and P2P signaling,
with a separate LiveKit SFU. One name and one Zov logo across all deployments.

This repository is the destination for new product development. It is private
while the release audit and license decision are pending. Production deployment
has not switched to this repository yet.

## Local development

Use Node 24, npm and Docker. The SFU Compose configuration uses host networking
and targets Linux. Open the client on the same machine; remote devices require
explicit reachable RTC addresses and HTTPS/WSS configuration.

```bash
npm run install:apps
npm run setup:local
# Builds the pinned, patched LiveKit server; first build may take several minutes.
docker compose up -d --build sfu
npm run dev:server
# In another terminal:
npm run dev:client
```

Open http://localhost:4000. Setup generates independent random secrets in ignored
files; it refuses to overwrite existing configuration. Stop the SFU with
`docker compose down`. API health: http://localhost:4001/healthz; SFU readiness:
http://localhost:4001/readyz.

## Checks

```bash
npm run lint
npm run test:server
npm run build
cd apps/client
npx playwright install --with-deps chromium webkit
npm run test:smoke
npm run test:integration
```

The integration suite starts its own loopback-only SFU and token fixture. It
checks two browser participants with synthetic media. It does not use the
production service. `/design` provides local UI previews without media access.

## Repository layout

- `apps/client`: browser application, Dockerfile and browser/media tests.
- `apps/server`: API, signaling, security tests and patched SFU build inputs.
- `scripts`: local configuration setup.
- `compose.yaml`: local SFU, independent of production infrastructure.

Product code, tests and generic self-hosting instructions belong here. Production
hosts, credentials, environment configuration, backup/restore and rollout belong
in private ops. Do not copy legacy deploy directories or deployment workflows
into this repository. See [migration status](docs/MIGRATION.md),
[contributors](CONTRIBUTORS.md) and [security policy](SECURITY.md).

## License

An open-source license has not been selected yet. No blanket reuse grant is made
by this preparation repository. Third-party notices remain applicable; the logo
font license is preserved in `apps/client/public/brand/v2/source/font-license.txt`.
