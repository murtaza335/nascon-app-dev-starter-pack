#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/competition-repo" >&2
  exit 1
fi

target=$1
if [[ ! -d "$target" ]]; then
  echo "Target does not exist: $target" >&2
  exit 1
fi

if [[ ! -d "$target/.git" ]]; then
  echo "Target must already be a Git repository: $target" >&2
  exit 1
fi

if find "$target" -mindepth 1 -maxdepth 1 ! -name '.git' -print -quit | grep -q .; then
  echo "Warning: target is not empty except for .git; refusing to transplant." >&2
  exit 1
fi

printf 'Copying starter into %s\n' "$target"
tar --exclude=.git --exclude=node_modules --exclude=.venv --exclude='reports/*' -cf - . | (cd "$target" && tar xf -)

cat <<EOF
Now run: cd $target && git add -A && git commit -m 'chore: scaffold' && git push -u origin HEAD
ONLY RUN AFTER 10:45 AM
Day-of checklist:
1. 10:00-10:44 check-in; confirm the competition repo is empty (0 commits, no README/.gitignore/license).
2. After 10:45: run transplant.sh, commit, push.
3. Read the spec's submission contract, then adjust ports/paths in compose and ci.yml.
4. Replace example.js with domain routes; fill TRACEABILITY.md as requirements are read.
5. Push at least hourly (2 points per miss). Last Day 1 push before 15:05, last Day 2 push before 14:05.
6. No pushes from 15:05 Day 1 to 10:15 Day 2.
EOF
