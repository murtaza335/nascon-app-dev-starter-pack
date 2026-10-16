# ARCHITECTURE.md: How the To-Do app is built

> **WHAT** we build is in `REQUIREMENTS.md`. This file is **HOW**.
> Update it whenever you add a service, folder, env var, or library.

---

## 1. System overview

```
  [ api: Express, Node 20 ]  ------>  [ db: PostgreSQL 16 ]
        ^
        |
  [ tests: pytest / node:test ]
```

This backend slice uses two containers only: `postgres` and `backend`. The mobile app is intentionally out of scope for this task, and no Redis, queue, or storage service is needed for the todo API.

## 2. Tech choices

| Layer | Choice | Why |
|-------|--------|-----|
| Mobile | React Native + Expo, React Navigation (native stack) | Fast iteration with Expo Go on a real phone |
| Token storage | `expo-secure-store` | Simple secure storage |
| Backend | Express on Node 20 (`node:20-alpine`) | Team knows it |
| Database | PostgreSQL 16 (`postgres:16-alpine`), `pg` driver, plain SQL | Relational data, no ORM overhead |
| Auth | JWT (`jsonwebtoken`), `bcryptjs` for hashing | Stateless, no native build issues on alpine |
| Validation | `zod` | One schema gives validation and error details |
| Backend tests | Node `node:test` for the container smoke and `pytest` for API checks | Simple, dependency-light coverage |

## 3. Repository layout

```
.
├── AGENTS.md  CLAUDE.md  ADR.md  TRACEABILITY.md  README.md
├── docker-compose.yml
├── docker-compose.override.yml      # local-only (if needed)
├── docs/
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   └── TASKS.md
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore                # node_modules
│   ├── package.json / package-lock.json
│   └── src/
│       ├── index.js                 # boot: run migrations, listen on 0.0.0.0:PORT, SIGTERM
│   ├── app.js                   # express app, middleware, route mounting, 404, error handler
│   ├── config.js                # env vars with defaults
│   ├── db/
│   │   ├── migrate.js           # idempotent CREATE TABLE/INDEX IF NOT EXISTS
│   ├── routes/                  # auth.js, todos.js, health.js
│   ├── controllers/             # parse request -> call service -> shape response
│   ├── services/                # auth-service.js, todo-service.js (all SQL lives here)
│   ├── validation/              # zod schemas per endpoint
│   ├── middleware/              # auth.js (verify JWT -> req.user), error-handler.js
│   └── utils/                   # AppError class, helpers
├── tests/
│   ├── api/                         # pytest API checks
│   └── perf/                        # k6 script
└── .github/workflows/ci.yml         # compose up, wait for /health, run API tests
```

## 4. Backend design

- **Layers:** `route -> controller -> service -> db`. A layer only calls the one below it. No SQL in routes or controllers.
- **Request pipeline:** JSON parser -> auth middleware on protected routes -> zod validation -> controller -> service -> response.
- **Errors:** services throw `AppError(status, code, message, details)`. One `errorHandler` middleware turns any error into the standard error format. Unknown errors become `500 INTERNAL_ERROR` with a generic message. Malformed JSON bodies become `400 VALIDATION_ERROR`.
- **Auth middleware:** reads `Authorization: Bearer <token>`, verifies with `JWT_SECRET`, loads `req.user = { id }`. Any failure -> `401 UNAUTHORIZED`.
- **Data isolation:** every todo query includes `WHERE user_id = $1`. For get/patch/delete, a missing row and a foreign row both give `404`.
- **Migrations:** `migrate.js` runs on startup before `listen`, creating tables and the index with `IF NOT EXISTS`. The server retries the DB connection a few times on boot as a safety net on top of the compose healthcheck.
- **List query:** build `WHERE` clauses dynamically but with parameter placeholders only. Sort columns come from a fixed whitelist map (never interpolate user input). `priority` sort uses a `CASE` expression; `due_date` sort uses `NULLS LAST`.
- **Stats query:** one SQL statement using `COUNT(*) FILTER (WHERE ...)`.
- **Health:** `GET /health` runs `SELECT 1`; 200 `{status:"ok"}` or 503 `{status:"error"}`.
- **Shutdown:** on `SIGTERM`, stop accepting requests and close the pool.

## 5. Mobile design

- **Navigation:** two stacks. Logged out: Login, Register. Logged in: TodoList, TodoForm. `AuthContext` decides which one shows.
- **Startup:** read token from secure store, call `GET /auth/me`, then route accordingly (see REQUIREMENTS section 6).
- **API client (`src/api/client.js`):** one function wrapping `fetch`. It adds the base URL and `Authorization` header, sends and parses JSON, returns `null` for `204`, and throws a typed error `{status, code, message, details}` built from the standard error format. On `401` from a protected call it triggers logout.
- **State:** hooks + context. List state (items, filters, page, loading) lives in `TodoListScreen`. No Redux.
- **Every screen:** loading, empty, and error states; `testID`s from REQUIREMENTS section 6.
- **Keys:** snake_case straight from the API, with no conversion layer.

## 6. Docker / Compose

| Service | Image / build | Ports | Depends on | Healthcheck |
|---------|---------------|-------|-----------|-------------|
| `postgres` | `postgres:16-alpine` | none exposed in base file | none | `pg_isready -U app` |
| `backend` | build `./backend` (`node:20-alpine`) | `"3000:3000"` | `postgres` (service_healthy) | reachable `/health` |

Volume: `pgdata` for Postgres data.

Rules:
- The base `docker-compose.yml` boots from a clean checkout with one command.
- `api` talks to the DB via `DATABASE_URL=postgres://app:app@db:5432/app`.
- Pin exact tags. Never `latest`.
- Run `docker compose config` before every push.

## 7. Configuration (env vars)

| Var | Used by | Default | Purpose |
|-----|---------|---------|---------|
| `PORT` | api | `3000` | HTTP port |
| `DATABASE_URL` | api | `postgres://app:app@db:5432/app` | DB connection |
| `JWT_SECRET` | backend | `dev-secret` | Token signing |
| `JWT_EXPIRES_IN` | backend | `24h` | Token lifetime |
| `POSTGRES_USER/PASSWORD/DB` | db | `app` / `app` / `app` | DB bootstrap |
| `EXPO_PUBLIC_API_URL` | mobile | `http://<laptop-ip>:3000` | Backend URL as seen from the phone |
| `BASE_URL` | tests | `http://localhost:3000` | Where tests send requests |

Nothing requires a secret to boot, because every variable has a default.

## 8. Networking during the competition

- Campus Wi-Fi isolates devices, so connect the laptop(s) and phone to the **team hotspot / travel router**.
- Phone -> backend: `http://<laptop-hotspot-ip>:3000`. Android emulator: `http://10.0.2.2:3000`.
- Android blocks plain HTTP by default. Enable cleartext traffic for development.
- Express must listen on `0.0.0.0` so it is reachable from outside the container.

## 9. Testing strategy

| Level | Tool | What it covers |
|-------|------|----------------|
| API | Jest + supertest against `API_URL` | Every endpoint E1-E10: happy path, each documented error code, ownership isolation (user B can't touch user A's todo -> 404), list filters/sort/pagination, stats invariant |
| Mobile UI | Appium (`testID`s) | Register -> add todo -> mark complete -> filter -> delete -> logout |
| Perf | k6 | Login once, then hammer `GET /todos` (small ramp) |
| Smoke | CI: `docker compose up -d`, poll `/health`, run API tests | Stack boots from scratch |

API tests create their own unique users (e.g. `user-<timestamp>@test.com`) so they can re-run against a dirty database.

## 10. Extensibility for Phase II

- Keep services independent of Express (plain functions taking plain arguments).
- Migrations stay additive (`ADD COLUMN IF NOT EXISTS`), with no renames or drops.
- API changes are backward compatible: add fields, never rename or remove.
- New infrastructure (cache, queue, storage) becomes a new compose service plus an env var, nothing more.

## 11. Known limitations

- No token refresh or revocation (24h JWT).
- No rate limiting on auth endpoints.
- `overdue` uses the server's UTC date, not the user's timezone.