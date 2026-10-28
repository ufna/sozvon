# Security

Do not include credentials, participant data or exploitable production details
in public issues. While this repository is private, report concerns directly
to the maintainer through the repository access channel. Before public release,
a private vulnerability reporting channel must be enabled and documented.

Never commit `.env` files, production configuration, call logs, recordings or
real user fixtures. Run Gitleaks over the complete Git history using
`.gitleaks.toml`. Its single exception permits only the literal public credential
in the loopback-only SFU test fixture; it does not exempt arbitrary test secrets.

The migration found a hardcoded Tinify credential in the legacy image optimizer.
That optimizer and credential are absent from the new repository history.
The credential must be revoked at the provider before the release audit is closed.
