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

The third repository has not been unambiguously identified. `ufna/hgdev-infra`
is a possible infrastructure repository; it has not been copied or modified.
Telegram/Slack bots also remain outside this initial client/server import.

Existing deployments still consume the legacy repositories. Do not archive them
or disable their workflows until a replacement deployment is validated.
The new repository is ready for product changes; deploying those changes needs
the following explicit operational cutover:

1. Identify the private ops destination and transfer environment configuration,
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
