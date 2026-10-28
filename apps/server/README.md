# sozvon server

Node 24 API and P2P signaling; LiveKit runs separately. See the root
[README](../../README.md) for local setup. `.env.example` lists configuration
without credentials. `LIVE_SECRET` and `SIGNALING_SECRET` must be independent,
random values of at least 32 characters. Bind defaults to loopback.
Set `ALLOWED_ORIGINS` explicitly for your deployment.

`/healthz` reports process health; `/readyz` verifies SFU authentication.
`/room/create` creates an anonymous room. Scoped one-hour tokens are issued by
`/room/token/livekit/:room` and `/room/token/p2p/:room`.

`npm test` covers request validation, tokens, rate limits and signaling.
`Dockerfile` builds the API; `Dockerfile.livekit` builds a pinned upstream SFU
with dependency overrides from `sfu/`. Both use this package as build context.
Production hosts, secrets and rollout instructions stay in private ops.
