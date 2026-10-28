#!/usr/bin/env bash
set -euo pipefail
name="voice-ci-sfu-$$"
api_pid=
cleanup() { if [[ -n "$api_pid" ]]; then kill "$api_pid" 2>/dev/null || true; fi; docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker build -f tests/fixtures/Dockerfile.sfu -t voice-ci-sfu:patched .
docker run -d --name "$name" --network host -v "$PWD/tests/fixtures/livekit.yaml:/config.yaml:ro" voice-ci-sfu:patched --config /config.yaml >/dev/null
ready=false
for attempt in {1..30}; do if curl -fsS http://127.0.0.1:17880/ >/dev/null; then ready=true; break; fi; sleep 1; done
[[ "$ready" == true ]]
node tests/fixtures/api.js &
api_pid=$!
SERVER_URL=http://127.0.0.1:14001/ SERVER_WS_URL=ws://127.0.0.1:14001/ DEV_MODE=true npm run build
TEST_MEDIA=1 npx playwright test tests/media.spec.js --project=chromium
