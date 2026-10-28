#!/usr/bin/env bash
set -euo pipefail
image=${SOZVON_IMAGE:-sozvon-selfhost:test}
name="sozvon-selfhost-test-$$"
volume="${name}-data"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; docker volume rm "$volume" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker volume create "$volume" >/dev/null
docker run -d --name "$name" --init --read-only --tmpfs /tmp:size=32m,noexec,nosuid \
 --cap-drop ALL --security-opt no-new-privileges:true \
 -p 127.0.0.1:18080:8080 -p 17891:17891/tcp -p 17892:17892/udp \
 -e PUBLIC_URL=http://localhost:18080 -e RTC_TCP_PORT=17891 -e RTC_UDP_PORT=17892 \
 -v "$volume:/data" "$image" >/dev/null
wait_ready() {
 for attempt in {1..90}; do
  if curl -fsS http://localhost:18080/api/readyz >/dev/null 2>&1; then return; fi
  if [[ $(docker inspect "$name" --format '{{.State.Running}}') != true ]]; then
   echo 'Self-hosted container exited before readiness' >&2; docker logs --tail 60 "$name"; return 1
  fi
  sleep 1
 done
 echo 'Self-hosted stack did not become ready' >&2; return 1
}
wait_ready
docker exec "$name" test -s /etc/ssl/certs/ca-certificates.crt
[[ $(curl -s -o /dev/null -w '%{http_code}' http://localhost:18080/missing.js) == 404 ]]
curl -fsS http://localhost:18080/ | python3 -c 'import sys; html=sys.stdin.read(); assert "http://localhost:18080/og-sozvon.png" in html; assert "https://sozvon.now/og-sozvon.png" not in html'
fingerprint() { docker exec "$name" node -e "const fs=require('node:fs'),c=require('node:crypto');process.stdout.write(c.createHash('sha256').update(fs.readFileSync('/data/secrets.json')).digest('hex'))"; }
before=$(fingerprint)
(cd apps/client && TEST_URL=http://localhost:18080 TEST_MEDIA=1 TEST_P2P=1 npx playwright test tests/media.spec.js --project=chromium)
docker restart -t 35 "$name" >/dev/null
wait_ready
[[ "$before" == "$(fingerprint)" ]]
echo 'Self-hosted SFU/P2P calls, reverse proxy, metadata and credential persistence verified'
