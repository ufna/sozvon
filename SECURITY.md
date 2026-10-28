# Reporting security issues

For suspected vulnerabilities, email [ufna@ufna.dev](mailto:ufna@ufna.dev).
Use GitHub private vulnerability reporting when it is enabled for this repository.
Do not post exploit details, credentials or participant data in public issues.

Include the affected revision, component, impact and a minimal reproduction
using synthetic participants. Remove room URLs, tokens, IP addresses, personal
paths and conversation content from diagnostics. Do not attach `.env` files,
recordings or complete production logs. Never test against someone else's calls.

The project is preparing its first public release; no separate long-term support
branches are maintained. Fixes target the current main branch.
See [architecture](docs/architecture.md) for room access and media trust boundaries.

Contributor secret-scanning instructions are in the
[development guide](docs/development.md#secrets-and-source-review). Pre-publication
audit and credential-rotation tasks are tracked in
[migration status](docs/MIGRATION.md).
