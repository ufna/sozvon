# Brand and README images

The project uses one name, **sozvon**, and the existing **Zov** mark.
`sozvon.svg` is a copy of the client master at
`apps/client/public/brand/v2/zov-mark.svg`. Keep the documentation mark in sync
when changing that source; do not introduce a second repository identity.

README images are WebP files in `readme/`, stored directly in Git. They show the
running browser application's local `/design` route in the studio theme,
in English (`lang=en`), with synthetic participants and chat. Camera and media
access are not used.
Avatar images are locally generated SVG monograms supplied only by the capture
script. All other external requests are blocked. No live calls are captured.

## Recreate screenshots

Use Node 24 and Python 3 with Pillow. Install the client dependencies and
Playwright Chromium, then start the client in one terminal:

```bash
npm run install:apps
cd apps/client
npx playwright install chromium
npm run dev -- --port 4400
```

From the repository root in another terminal:

```bash
node scripts/capture-readme.mjs
```

The script enforces English visible text before saving each image and uses
1440×900 desktop and 390×844 mobile viewports. It waits for
local fonts and images and captures home, lobby, meeting, settings and mobile Driver mode views.
`SCREENSHOT_URL` may select a different **loopback** server; remote hosts are
rejected to avoid accidental capture of a real meeting.

`social-preview.png` is the prepared 1280×640 repository social image. Its
code-native source and renderer are `social-preview.svg` and
`../../scripts/render-social-preview.py`. The image is ready to upload in GitHub
Settings → General → Social preview; it is separate from the application's
1200×630 Open Graph images.

Roboto Flex UI fonts and Noto-derived logo outlines retain their own font
licenses. See [third-party notices](../../THIRD-PARTY-NOTICES.md).
