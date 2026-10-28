# sozvon client

Run development and checks from the root as described in [README](../../README.md).
This package uses React, MobX, LiveKit and Vite. The fixed identity is `sozvon`
with the Zov vector mark; browser preferences and deployment hostnames do not
change it. `/design` previews home, lobby, call and mobile views locally.

Build from this directory with `npm run build`. Build-time variables:
`SERVER_URL`, `SERVER_WS_URL`, `DEV_MODE`, `ICE_SERVERS`, `VERSION`.
For production set HTTPS/WSS API addresses and `DEV_MODE=false` explicitly.
Docker build context is this package directory. Production rollout is managed
separately in private ops. Browser icons and link previews are generated with
`python3 scripts/generate-brand-assets.py` (rsvg-convert and Pillow required).
