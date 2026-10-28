# Deployment

The maintained sozvon instance deploys from `main` after the Check job passes.
Pull requests run checks without production credentials. Forks and independent
self-hosted copies run checks unless deployment is explicitly configured.

## Pipeline

1. Install exact dependency locks, lint, run API/bot tests and build the client.
2. Run Chromium/WebKit UI checks, isolated SFU media checks and full-history
   secret scanning.
3. Build API, client and bot containers from that tested revision and publish
   immutable image digests to GHCR, with source and revision labels.
4. Use host-owned deployment helpers to promote the API through a ready inactive
   slot, atomically switch client files, then replace the sole bot poller.
   Each component restores its previous version if its own promotion fails.

API/client/bot updates do not replace LiveKit. Updating the SFU is a separate
manual workflow option, `deploy_sfu`, and is refused while rooms are occupied.
API replacement reconnects P2P signaling; the SFU media service stays running.
A failure in a later component does not roll back components already promoted.

## Configuration

The workflow is disabled for deployment unless repository variable
`PRODUCTION_DEPLOY_ENABLED` is `true`. Set up a `prod` environment restricted to
`main` before enabling it. Container publishing uses the job's scoped
`GITHUB_TOKEN`; hosts need read access to their private registry images.

Production environment variables:

- `SERVER_URL`, `SERVER_WS_URL`: client build-time API/signaling addresses.
- `SSH_HOST`, `SSH_USER`: media/web deployment destination.
- `BOT_SSH_HOST`, `BOT_SSH_USER`: optional bot deployment destination.

Production environment secrets:

- `SSH_KEY`, `SSH_KNOWN_HOSTS`: restricted media/web key and authenticated host key.
- `BOT_SSH_KEY`, `BOT_SSH_KNOWN_HOSTS`: separate restricted bot key and host key.

These SSH keys permit only validated deployment commands, without an interactive
shell, forwarding or arbitrary script upload. Runtime credentials, hostnames,
nginx, host helpers and authorized public keys are managed in private ops.
Never place administrative SSH keys or runtime secrets in this repository.

Application build contexts and generic configuration are documented in
[self-hosting](self-hosting.md). Hosted-instance access and rollback procedures
belong in the private operations runbook.
