# Migration status

## Imported

- Client snapshot: `2bf310c0067e9cf104ca338639cc054548505171`; server snapshot: `8bd0702389ac1de5b42cff150f2042601b51a7de`.
- No legacy Git ancestry, deployment workflows, production deploy directories,
  LFS pointers or credentials were intentionally carried over.
- Two final client layout fixes were replayed with their original author and
  author date. Their hashes changed because paths and ancestry changed.
- Earlier contributions are credited in CONTRIBUTORS.md; historical per-line
  blame remains available only in the private source archives.
- Product identity is sozvon / Zov. Legacy brand switches were removed.
- The legacy Tinify optimizer was excluded from every imported commit.

## Before public release

- [ ] Revoke the legacy Tinify credential at the provider.
- [ ] Complete manual review for personal data, assets and third-party rights.
- [ ] Select a license with the contributing rights holders.
- [ ] Enable and document private vulnerability reporting.
- [ ] Repeat full-history secret scan and clean-checkout local-call verification.

## Production handover

The third source is `ufna/voice-bot-tg`, present locally as `voice-bot`.
Bot snapshot: `c16ac2337f159a9b7c105a14a71a2bb55f1f6034`.
Its tracked product snapshot is imported into `apps/bot`, excluding deployment
files and history. Telegram branding is unified and SITE_URL is configurable.
The separate Slack bot is outside this migration. `ufna/hgdev-infra` contains
Voice infrastructure roles and operational documentation; those remain private
and have not been modified.

Existing deployments still consume the legacy repositories. Do not archive them
or disable their workflows until a replacement deployment is validated.
The new repository is ready for product changes; deploying those changes needs
the following explicit operational cutover:

1. Use the private infrastructure repository for environment configuration,
   deployment scripts and existing rollback procedures there.
2. Build versioned client/API/SFU artifacts from this repository, keeping the
   build contexts at apps/client and apps/server. Publish immutable digests.
3. Make ops consume approved digests; validate staging and rollback. Keep SFU
   updates separate from API updates so ongoing calls are not interrupted.
4. Move active issues and branch protections, announce a development freeze on
   the source repositories, then disable their old deployment triggers.
5. Archive the source repositories privately after successful cutover.

No production secrets, DNS, running services or legacy repository settings were
changed by this import.

## Validation

Node 24: linters, five server security tests and two bot locale/configuration
tests passed. All 32 Chromium UI checks
passed. Both SFU and P2P two-participant media scenarios passed against the
imported API and local patched SFU. The isolated SFU fixture also passed.
Local WebKit execution needs missing ICU/Flite libraries; CI runs both browsers
on Ubuntu. Full new-history Gitleaks scan passed with only the exact loopback
test credential allowlisted. Manual privacy/rights review and license selection
remain required before public release.
