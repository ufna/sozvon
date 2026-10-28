# voice-client

Sozvon browser client: React 19, MobX 7, LiveKit, Tailwind 4 and Vite 8.
Use Node 24 (`.nvmrc`); install exactly with `npm ci --ignore-scripts`.

```bash
npm run dev
npm run build
npm run lint
npx playwright install --with-deps chromium webkit
npm run test:smoke
npm run test:integration   # Docker required; real two-participant SFU test
```

The integration test builds patched LiveKit from a pinned upstream archive,
starts an isolated token issuer and verifies audio, camera, screen sharing,
volume, nicknames, chat, settings, reload and return to the meeting
with fake Chromium devices. It binds loopback ports 14001/17880/17881/17882 and
cleans up its own processes/container. WebKit covers the interface; the live
media test can also run against an explicitly selected staging or production URL.

Keyboard shortcuts: Space — microphone, V — camera, S — screen share,
C — chat, Escape — leave the chat input. They use physical key positions and
ignore text inputs. Safe Driving provides a large mobile microphone control.
Drag the chat panel's inner edge to resize it; the width is saved locally.
The focused divider also supports the arrow keys, Home and End.
In the expanded participant view, drag below the thumbnails to change their
size. This preference is saved too; double-click either divider to reset it.

Build variables: `SERVER_URL`, `SERVER_WS_URL`, `DEV_MODE`, `ICE_SERVERS`,
`VERSION`. Production must use HTTPS/WSS and `DEV_MODE=false`.

Deployment is described in [deploy/DEPLOY.md](deploy/DEPLOY.md).

Design review: open `/design` to compare the home screen, pre-join lobby,
conference, mobile layouts and three logo concepts. Use `/design?view=mobile`
for the interactive phone preview, or add `embed=1` to see a screen without
the review navigation. This route simulates media and chat locally;
it never connects to a meeting server or requests camera/microphone access.
The logo and name selectors save the preview choice in this browser
(`sozvon.logo`, `govoice.identity`). Each mark has Sozvon and GoVoice lockups.
Vector masters, monochrome variants and transparent PNGs are in `public/brand/v2/`.
Run `npx playwright test tests/design.spec.js` to check the review interactions,
including nickname editing, participant expansion and mobile controls.

Current design proposal: `/design?theme=studio` (neutral graphite, raised capsule controls).

Browser/PWA icons and the two 1200×630 link previews use the Zov vector mark.
Rebuild them with `python3 scripts/generate-brand-assets.py` (rsvg-convert and
Pillow required). The build emits `index-govoice.html` for GoVoice crawlers;
nginx selects it by hostname for home and room URLs. Both HTML shells contain
absolute Open Graph images and link to their own install manifests without JS.
