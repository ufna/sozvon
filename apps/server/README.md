# voice-server

Sozvon API and P2P signaling run on Node 24. LiveKit runs in a separate container.
API deployments preserve SFU sessions; explicit SFU updates refuse occupied rooms.

```bash
npm ci --ignore-scripts
npm run lint
npm test
cp .env.example .env
# Fill LIVE_SECRET and SIGNALING_SECRET with independent random 32+ character values.
npm run dev
```

`DEV_MODE` defaults to false. No committed secret defaults are accepted. The API
binds to loopback by default. Local development needs a separately running
LiveKit with matching `LIVE_KEY`/`LIVE_SECRET`, HTTP API on 7880 and RTC ports
7881/TCP and 7882/UDP. `.env.example` documents local URLs. `.env` stays ignored.

Endpoints: `/healthz` reports process health, `/readyz` verifies SFU authentication
and availability. `/room/create` creates an anonymous UUID room; scoped one-hour
tokens are issued by `/room/token/livekit/:room` and `/room/token/p2p/:room`.
Identities must be UUIDs. P2P tokens require HS256, issuer and audience checks.
The API has CORS, request/rate limits and JSON errors. Signaling enforces an
authentication deadline, payload/rate/connection/room limits and heartbeat cleanup.

See [deploy/DEPLOY.md](deploy/DEPLOY.md) for runtime configuration and rollback.
