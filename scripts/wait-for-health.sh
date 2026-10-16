#!/usr/bin/env bash
set -euo pipefail

url=${1:-}
timeout_seconds=${2:-120}

if [[ -z "$url" ]]; then
  echo "Usage: $0 URL [TIMEOUT=120]" >&2
  exit 1
fi

start_epoch=$(date +%s)
while true; do
  if curl -fsS "$url" >/dev/null; then
    exit 0
  fi

  now_epoch=$(date +%s)
  if (( now_epoch - start_epoch >= timeout_seconds )); then
    echo "Timed out waiting for $url after ${timeout_seconds}s" >&2
    exit 1
  fi

  sleep 2
done
