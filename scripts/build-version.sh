#!/usr/bin/env bash
set -euo pipefail
run_number=${1:?Pass the GitHub Actions workflow run number}
[[ "$run_number" =~ ^[1-9][0-9]*$ ]] || { echo 'Expected a positive workflow run number' >&2; exit 1; }
# Archived client: 34 runs + historical offset 66 = 100. The new workflow
# already used runs 1–9; run 10 continues the sequence at version 0.101.
printf '0.%s\n' "$((run_number + 91))"
