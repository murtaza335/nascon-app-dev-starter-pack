# NaSCon '26 App Dev Competition Starter

## What this is

This repository is a generic skeleton for an 8-hour mobile app-dev competition. It contains infrastructure, scripts, test harnesses, and document templates only. The domain-specific application logic is intentionally left out so the repo can be transplanted into the empty competition repo on the day.

## Quick start

```bash
cp .env.example .env
docker compose up --build -d --wait
curl localhost:3000/health
```

## Services and ports

| Service | Port(s) | Notes |
| --- | --- | --- |
| backend | 3000 | API and health endpoint |
| postgres | 5432 | Database inside the compose network |
| redis | 6379 | Cache inside the compose network |
| selenium hub | 4442-4444 | Only in the test override |
| appium | 4723 | Host service, not in compose |
| metro | 8081 | Host service, not in compose |

## Running tests

API:

```bash
./scripts/run-tests.sh
```

Web smoke:

```bash
./scripts/run-tests.sh ui
```

Mobile smoke:

```bash
pytest -c tests/pytest.ini tests/e2e-mobile
```

Perf:

```bash
docker compose -f docker-compose.yml -f docker-compose.test.yml --profile perf run --rm k6
```

## Repo layout

- `backend/` Node 20 + Express backend container and example routes.
- `tests/` Python harness, Selenium/Appium fixtures, and k6 smoke script.
- `scripts/` setup, health, push, preflight, and transplant helpers.
- `docs/` team and Android/mobile notes.
- `reports/` generated artifacts.

## Hourly push

```bash
./scripts/push.sh "message"
```

## Env vars

| Variable | Default | Purpose |
| --- | --- | --- |
| BACKEND_PORT | 3000 | Host port published for the backend |
| POSTGRES_USER | app | Postgres user |
| POSTGRES_PASSWORD | app | Postgres password |
| POSTGRES_DB | app | Postgres database |
| BASE_URL | http://localhost:3000 | Host-side test target |
| SELENIUM_URL | http://localhost:4444 | Selenium hub for browser tests |
| BROWSER_BASE_URL | http://backend:3000 | Browser-side backend URL inside compose |
| APPIUM_URL | http://localhost:4723 | Appium server URL on the host |

## Day-of checklist

1. 10:00-10:44 check-in; confirm the competition repo is empty (0 commits, no README/.gitignore/license).
2. After 10:45: run `transplant.sh`, commit, push.
3. Read the spec's submission contract, then adjust ports/paths in compose and `ci.yml`.
4. Replace `example.js` with domain routes; fill `TRACEABILITY.md` as requirements are read.
5. Push at least hourly (2 points per miss). Last Day 1 push before 15:05, last Day 2 push before 14:05.
6. No pushes from 15:05 Day 1 to 10:15 Day 2.

## Troubleshooting

- Port already in use: change `BACKEND_PORT` or stop the conflicting process.
- SELinux bind mounts: every host bind mount in compose needs `:z` on Fedora.
- Docker memory: keep the stack light; close browsers and IDEs when running Gradle/Appium.
- CRLF endings: scripts must stay LF; run them through Bash, not PowerShell.
- `_JAVA_OPTIONS`: unset it if Gradle or Kotlin daemons start reserving too much heap.
- `adb unauthorized`: accept the prompt on the phone.
- `adb no permissions`: add the correct udev rule for the phone vendor.
- Metro `ENOSPC`: raise inotify watches with `echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/99-inotify.conf && sudo sysctl --system`.
- Firewall: verify the phone can open `http://<laptop-ip>:3000/health`; on Fedora Workstation you can usually open `3000/tcp`, `8081/tcp`, and `4723/tcp` with `sudo firewall-cmd --add-port=3000/tcp --add-port=8081/tcp --add-port=4723/tcp`.
