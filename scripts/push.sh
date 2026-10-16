#!/usr/bin/env bash
set -euo pipefail

message=${1:-}
branch=$(git branch --show-current)
local_time=$(date '+%Y-%m-%d %H:%M')

printf 'Local time: %s\n' "$local_time"

git pull --rebase --autostash origin "$branch" || true

git add -A
if git diff --cached --quiet; then
  echo 'No changes to commit.'
else
  if [[ -z "$message" ]]; then
    message="chore: hourly checkpoint $(date +%H:%M)"
  fi
  git commit -m "$message"
fi

if ! git push -u origin HEAD; then
  printf '\033[31mPush failed.\033[0m\n' >&2
  exit 1
fi

sha=$(git rev-parse HEAD)
next_push=$(date -d '+55 minutes' '+%H:%M')
printf 'Pushed %s\nNext push due before %s\n' "$sha" "$next_push"
