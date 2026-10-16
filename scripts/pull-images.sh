#!/usr/bin/env bash
set -euo pipefail

images=(
  postgres:16-alpine
  redis:7-alpine
  minio/minio:RELEASE.2024-09-22T00-33-43Z
  rabbitmq:3.13-management-alpine
  nats:2.10-alpine
  bluenviron/mediamtx:1.9.1
  livekit/livekit-server:v1.7.2
  binwiederhier/ntfy:v2.11.0
  prom/prometheus:v2.54.1
  grafana/grafana:11.2.0
  grafana/k6:0.54.0
  selenium/hub:4.24.0
  selenium/node-chrome:4.24.0
  selenium/node-firefox:4.24.0
  selenium/node-edge:4.24.0
  python:3.12-slim
  node:20-alpine
)

# Apple Silicon users still use the same pinned tags; this script keeps the pull list portable.
for image in "${images[@]}"; do
  if [[ "$image" == "minio/minio:RELEASE.2024-09-22T00-33-43Z" ]]; then
    docker pull "$image" || docker pull quay.io/minio/minio:RELEASE.2024-09-22T00-33-43Z
  else
    docker pull "$image"
  fi
done

docker images
