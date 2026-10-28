# Contributing

Bug reports and pull requests are welcome at
[ufna/sozvon](https://github.com/ufna/sozvon). For security issues, follow
[SECURITY.md](SECURITY.md) instead of posting exploit details in an issue.

## Report a bug

Include what happened, what you expected, steps to reproduce, browser/OS and
whether the call used SFU or P2P. For media issues, say whether microphone,
camera or screen sharing was involved and whether another participant could
reproduce it. Redact room links, tokens, user names, addresses and personal data.
Screenshots and logs must use synthetic participants.

## Make a change

Use Node 24, install with `npm run install:apps` and follow the
[development guide](docs/development.md). Keep a pull request focused on one
behavior. Explain the problem, resulting behavior and the checks actually run.
Link an issue when one exists; an issue is not required for a small fix.

Match the existing JavaScript style. For a behavior fix, include a regression
check that demonstrates the failure and the corrected result when practical.
Run lint and the tests relevant to the changed application. For call behavior,
run the real media scenario and state which browsers/modes were verified.
Documentation-only changes need link and rendering review, not another full
media run.

Client, API, SFU build inputs and bot source belong here. Production hosts,
credentials, user data and rollout configuration do not. Never copy a legacy
`.env`, call recording, support dump or production log into a patch. Keep the
Gitleaks allowlist limited to the existing exact loopback fixture credential.

Contributions are provided under this repository's [MIT license](LICENSE).
Retain third-party notices and confirm that new assets or code can be distributed
under their stated terms. Existing contributors are credited in
[CONTRIBUTORS.md](CONTRIBUTORS.md).
