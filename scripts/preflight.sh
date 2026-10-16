#!/usr/bin/env bash
set -euo pipefail

ok() { printf 'OK    %s\n' "$1"; }
missing() { printf 'MISSING %s\n' "$1"; }
warn() { printf 'WARN  %s\n' "$1"; }

check_command() {
  local label=$1
  shift
  if "$@" >/dev/null 2>&1; then
    ok "$label"
  else
    missing "$label"
  fi
}

check_command 'docker' docker --version
check_command 'docker compose' docker compose version

if id -nG | tr ' ' '\n' | grep -qx docker; then
  ok 'user in docker group'
else
  warn 'user is not in the docker group'
fi

check_command 'git' git --version
if git config --get init.defaultBranch >/dev/null 2>&1; then
  ok "git init.defaultBranch=$(git config --get init.defaultBranch)"
else
  warn 'git init.defaultBranch is unset'
fi

if command -v node >/dev/null 2>&1; then
  node_version=$(node -p 'process.versions.node.split(".")[0]')
  if [[ "$node_version" -gt 22 ]]; then
    warn 'node major version is above 22; containers use Node 20; run nvm use 20 before generating lockfiles'
  else
    ok "node $(node --version)"
  fi
else
  missing 'node'
fi

check_command 'npm' npm --version
check_command 'python3' python3 --version
if python3 -m venv --help >/dev/null 2>&1; then
  ok 'python3 venv'
else
  missing 'python3 venv'
fi

check_command 'adb' adb version
if command -v adb >/dev/null 2>&1; then
  adb devices || true
fi

if [[ -n "${JAVA_HOME:-}" ]]; then
  ok "JAVA_HOME=$JAVA_HOME"
else
  warn 'JAVA_HOME is unset'
fi

if [[ -n "${ANDROID_HOME:-}" ]]; then
  ok "ANDROID_HOME=$ANDROID_HOME"
else
  warn 'ANDROID_HOME is unset'
fi

if [[ -n "${_JAVA_OPTIONS:-}" ]]; then
  warn '_JAVA_OPTIONS is set; Gradle/Kotlin daemons may each reserve a large heap on a 16 GB laptop'
else
  ok '_JAVA_OPTIONS is unset'
fi

check_command 'appium' appium --version
if command -v appium >/dev/null 2>&1; then
  appium driver list --installed || true
fi

if command -v getenforce >/dev/null 2>&1; then
  ok "SELinux $(getenforce)"
else
  warn 'getenforce unavailable'
fi

if [[ -r /proc/sys/fs/inotify/max_user_watches ]]; then
  watches=$(cat /proc/sys/fs/inotify/max_user_watches)
  if [[ "$watches" -lt 200000 ]]; then
    warn "inotify max_user_watches=$watches; fix with echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/99-inotify.conf && sudo sysctl --system"
  else
    ok "inotify max_user_watches=$watches"
  fi
else
  warn 'cannot read inotify max_user_watches'
fi

if ssh -o BatchMode=yes -T git@github.com >/dev/null 2>&1; then
  ok 'ssh to github.com works'
else
  warn 'ssh to github.com failed; try port 443 if campus blocks port 22'
  if ssh -o BatchMode=yes -p 443 -T git@ssh.github.com >/dev/null 2>&1; then
    ok 'ssh to ssh.github.com:443 works'
  else
    warn 'ssh over port 443 also failed'
  fi
fi

if command -v hostname >/dev/null 2>&1; then
  ips=$(hostname -I 2>/dev/null || true)
  if [[ -n "$ips" ]]; then
    ok "local LAN IPs for the hotspot: $ips"
  else
    warn 'no LAN IPs found'
  fi
fi

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

for image in "${images[@]}"; do
  if docker image inspect "$image" >/dev/null 2>&1; then
    ok "image present: $image"
  else
    warn "image missing locally: $image"
  fi
done

if command -v free >/dev/null 2>&1; then
  free -h | awk 'NR==2 {print "free RAM: "$4}'
fi
