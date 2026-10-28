# Third-party notices

sozvon project code is licensed under [MIT](LICENSE). Dependencies and imported
assets retain their own licenses; the project license does not replace them.
Package locks identify exact JavaScript dependency versions. Their distributions
include the applicable license texts. This summary covers major runtime
components and is not a complete dependency inventory.

| Component | License | Where used |
| --- | --- | --- |
| React and React DOM | MIT | Browser UI. |
| MobX | MIT | Browser state. |
| LiveKit client and server SDKs | Apache-2.0 | Browser media and server token/API integration. |
| LiveKit track processors | Apache-2.0 | Browser media processing. |
| Express and ws | MIT | API and WebSocket signaling. |
| grammY | MIT | Optional Telegram bot. |
| Font Awesome Free | CC BY 4.0 icons; SIL OFL 1.1 fonts; MIT code | Browser icons and bundled webfonts. |

The SFU container builds upstream LiveKit, rather than vendoring its source here.
Its upstream license and transitive dependency notices remain applicable to any
binary distribution. The SFU Go module manifests identify the dependency inputs.

## Fonts and brand lettering

Roboto Flex files in `apps/client/public/static/fonts/` are used by the UI.
The upstream [SIL OFL text](docs/licenses/roboto-flex-OFL.txt) is preserved here.
The logo's existing Noto-derived lettering has a
[source notice](apps/client/public/brand/v2/source/font-license.txt) and the
[upstream Noto OFL text](docs/licenses/noto-OFL.txt).
The mark and outlined lockups are kept in the client brand directory.

## Documentation images

README screenshots are captures of the running local UI with synthetic
participants and messages. The capture script supplies its own SVG monogram
avatars and blocks external requests. No external avatar artwork, participant
photos or live call recordings are used in these documentation captures.
The social image is rendered from the checked-in SVG source.
[Provenance and reproduction](docs/assets/README.md).

Redistributions must preserve the applicable dependency and asset notices. Check
new binary assets, fonts and transitive dependencies when preparing a release.
