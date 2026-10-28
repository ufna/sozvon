<h1 align="center">
  <img src="docs/assets/sozvon.svg" alt="" width="64" valign="middle" /> sozvon
</h1>

<p align="center">
  <strong>Everything you need for a call.</strong><br />
  Fast, minimal video meetings: audio, video, screen sharing and chat.<br />
  Proven in production across tens of thousands of calls.
</p>

<p align="center">
  <a href="https://sozvon.now">Try sozvon</a> &nbsp; | &nbsp;
  <a href="#features">Features</a> &nbsp; | &nbsp;
  <a href="#quick-start">Quick start</a> &nbsp; | &nbsp;
  <a href="docs/self-hosting.md">Self-hosting</a> &nbsp; | &nbsp;
  <a href="CONTRIBUTING.md">Contribute</a><br />
  <sub>Browser &nbsp; | &nbsp; Desktop and mobile &nbsp; | &nbsp; LiveKit SFU and P2P &nbsp; | &nbsp; MIT</sub>
</p>

<p align="center">
  <a href="https://github.com/ufna/sozvon/actions/workflows/check.yml"><img src="https://github.com/ufna/sozvon/actions/workflows/check.yml/badge.svg" alt="Build, tests and secret scanning" /></a>
  <a href="docs/development.md"><img src="https://img.shields.io/badge/Node.js-24-77b9a2?style=flat-square&amp;labelColor=202020" alt="Node.js 24" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-ff9a00?style=flat-square&amp;labelColor=202020" alt="MIT license" /></a>
</p>

<p align="center">
  <a href="docs/assets/readme/meeting.webp"><img src="docs/assets/readme/meeting.webp" alt="sozvon desktop meeting with four synthetic participants, chat and call controls" width="1100" /></a>
</p>

sozvon keeps calls simple: audio, video, screen sharing and chat, with just the
controls you need. It has handled tens of thousands of calls in production. Send a link;
people choose a name and join from their browser. Check your microphone and camera
before entering, expand a participant when you need a closer look, or keep the
call beside its chat. The same interface adapts to a phone.

Run the React client, Node.js API and LiveKit SFU on your own infrastructure.
P2P mode uses the API for signaling. An optional Telegram bot creates invitations
from a command or an inline query. All three applications live in this repository.

## Features

<table>
  <tr>
    <td width="42%" valign="middle">
      <h3>Start with a link</h3>
      <p>Create a room and send its URL. No accounts to create or contact lists to maintain. Choose a display name and check your microphone and camera in the lobby before joining.</p>
    </td>
    <td width="58%">
      <a href="docs/assets/readme/lobby.webp"><img src="docs/assets/readme/lobby.webp" alt="Pre-join lobby with a synthetic participant avatar, name, microphone and camera controls" width="640" /></a>
    </td>
  </tr>
  <tr>
    <td valign="middle">
      <h3>Keep the conversation together</h3>
      <p>Audio, camera, screen sharing and chat share one meeting. Resize the chat, expand a participant or adjust a person's volume. Keyboard controls keep common actions close at hand.</p>
    </td>
    <td>
      <a href="docs/assets/readme/meeting.webp"><img src="docs/assets/readme/meeting.webp" alt="Four participant cards beside a resizable chat panel in the running sozvon demo" width="640" /></a>
    </td>
  </tr>
  <tr>
    <td valign="middle">
      <h3>Make the call comfortable</h3>
      <p>Choose your devices, tune camera and screen-sharing quality, set incoming volume and switch interface language. Ten languages are included: English, Russian, German, Spanish, French, Portuguese, Chinese, Japanese, Korean and Arabic.</p>
    </td>
    <td>
      <a href="docs/assets/readme/settings.webp"><img src="docs/assets/readme/settings.webp" alt="sozvon settings panel over the demo meeting" width="640" /></a>
    </td>
  </tr>
</table>

### The same room on your phone

The lobby and call controls adapt to narrow screens. **Driver mode** puts a
large microphone toggle and speaker status within easy reach. You can return to a recent meeting from the home screen.

<table>
  <tr>
    <th width="33%">Check before joining</th>
    <th width="34%">Stay in the conversation</th>
    <th width="33%">Driver mode</th>
  </tr>
  <tr>
    <td align="center"><a href="docs/assets/readme/mobile-lobby.webp"><img src="docs/assets/readme/mobile-lobby.webp" alt="sozvon pre-join lobby on a phone-sized viewport" width="280" /></a></td>
    <td align="center"><a href="docs/assets/readme/mobile.webp"><img src="docs/assets/readme/mobile.webp" alt="sozvon meeting and controls on a phone-sized viewport" width="280" /></a></td>
    <td align="center"><a href="docs/assets/readme/driver-mode.webp"><img src="docs/assets/readme/driver-mode.webp" alt="Driver mode with a large microphone control and speaker status" width="280" /></a></td>
  </tr>
</table>

### Invitations from Telegram

Type `/sozvon` or use the bot inline in another chat to create a room link.
Russian and English bot messages point to the same sozvon instance. Set
`SITE_URL` to your deployment and use your own bot token.
[Bot setup](apps/bot/README.md).

## Quick start

Run the ready-made image on a Linux x86-64 machine with Docker:

```bash
docker run -d --name sozvon --init --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -p 7881:7881/tcp -p 7882:7882/udp \
  -v sozvon-data:/data \
  ghcr.io/ufna/sozvon:latest
```

Open **http://localhost:8080**. The image includes the client, API, SFU and HTTPS
proxy. It generates its own keys and preserves them in the data volume.
For your own domain, set `PUBLIC_URL` and expose the web and RTC ports.

[Docker and Compose guide](docs/docker.md) ·
[Develop from source](docs/development.md) ·
[Deploy components separately](docs/self-hosting.md)

## Your server, your deployment

The client, API, SFU and optional bot have separate build contexts. You control
their configuration, updates and operating environment. Room links grant access
to a call; there are no user accounts or host approval controls in the current API.

Self-hosting does not imply end-to-end encryption: SFU mode routes media through
your LiveKit server. The client also requests generated avatars from DiceBear and
uses public STUN defaults unless configured otherwise.
[Architecture and data flow](docs/architecture.md) · [Security](SECURITY.md).

## Documentation

| Guide | What it covers |
| --- | --- |
| [Docker](docs/docker.md) | One ready-made image, local calls, domain/HTTPS setup and updates. |
| [Self-hosting](docs/self-hosting.md) | Local setup, configuration, build contexts and public deployment requirements. |
| [Deployment](docs/deployment.md) | Checks, immutable images and automatic main-branch deployment. |
| [Development](docs/development.md) | Repository layout, commands, browser tests and real media verification. |
| [Architecture](docs/architecture.md) | Client, API, SFU, P2P signaling and the Telegram integration. |
| [Contributing](CONTRIBUTING.md) | Bug reports, changes and the checks relevant to a pull request. |
| [Brand and screenshots](docs/assets/README.md) | Vector source, image provenance and capture instructions. |
| [Third-party notices](THIRD-PARTY-NOTICES.md) | Dependency licenses, font notices and the remaining asset review. |

## Contributing

[Report a bug](https://github.com/ufna/sozvon/issues) or open a pull request.
For changes to calls, include the browser, connection mode and how the behavior
was verified. Use synthetic participants and remove credentials from diagnostics.
See [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributors

**[Nikolay Prudnikov (@nprudnikov)](https://github.com/nprudnikov)** contributed
to the original client and server, including P2P calling, localization and room
validation. **[Vladimir Alyamkin (@ufna)](https://github.com/ufna)** contributes
to the applications, Telegram integration and project maintenance.

[Contribution credits and preserved authorship](CONTRIBUTORS.md).

[MIT](LICENSE)
