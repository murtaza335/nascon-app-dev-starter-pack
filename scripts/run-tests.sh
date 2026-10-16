#!/usr/bin/env bash
set -euo pipefail

use_docker=false
use_ui=false

for arg in "$@"; do
  case "$arg" in
    --docker) use_docker=true ;;
    ui) use_ui=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

mkdir -p reports
cleanup() {
  docker compose logs --no-color > reports/compose.log 2>&1 || true
}
trap cleanup EXIT

if [[ "$use_ui" == true ]]; then
  docker compose -f docker-compose.yml -f docker-compose.test.yml --profile ui up --build -d --wait
else
  docker compose up --build -d --wait
fi

./scripts/wait-for-health.sh http://localhost:3000/health 120

if [[ "$use_docker" == true ]]; then
  test_args=(tests/api)
  if [[ "$use_ui" == true ]]; then
    test_args+=(tests/e2e-web)
  fi
  docker run --rm --network host -v "$PWD:/w:z" -w /w \
    -e BASE_URL=http://localhost:3000 \
    -e SELENIUM_URL=http://localhost:4444 \
    python:3.12-slim sh -c "pip install -q -r tests/requirements.txt && pytest -c tests/pytest.ini ${test_args[*]}"
else
  pytest -c tests/pytest.ini tests/api
  if [[ "$use_ui" == true ]]; then
    pytest -c tests/pytest.ini tests/e2e-web
  fi
fi
