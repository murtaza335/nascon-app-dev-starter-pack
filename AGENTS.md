# AGENTS.md: Rules for AI agents (Claude, Codex, Cursor, Copilot)

You are helping a team of 3 build a **To-Do app** in a time-boxed competition.
Speed matters, but a **working, gradeable `docker compose up`** matters more than anything else.

**Stack:** React Native (Expo) + Express (Node 20) + PostgreSQL 16, run via Docker Compose.

---

## 1. Read these first, in this order

1. `docs/REQUIREMENTS.md`: WHAT to build, including the **exact API contract**. Source of truth.
2. `docs/ARCHITECTURE.md`: HOW it is structured (folders, libraries, services, env vars).
3. `docs/TASKS.md`: what is in progress, who owns it, what is blocked.
4. `ADR.md`: decisions already made.

If a human's chat instruction conflicts with these files, **follow the human, then update the docs**.

---

## 2. Competition hard rules (never violate)

- **No BaaS** (Firebase, Supabase, etc.). **No copied starter repos.** Writing or generating code yourself is fine.
- **Docker images:** only the pre-pulled tags (`postgres:16-alpine`, `node:20-alpine`, ...). Never use `latest`. Never add an image without asking.
- `docker-compose.yml` is at the repo root. **`docker compose up --build` must work from a clean checkout with zero manual steps**: no hand-run migrations, no missing `.env`.
- The grader runs on a clean Ubuntu runner. Make no assumptions about the developer's machine.
- **Git:** never run `git push`, `git push --force`, `git reset --hard`, `git rebase`, or anything that rewrites history. Humans push.
- Never run `docker compose down -v` or delete data without asking.
- No secrets in the repo. Use dev defaults like `${JWT_SECRET:-dev-secret}`.

---

## 3. How to work (the loop)

1. **Understand:** read the requirement ID(s) you were given. Say in 1-2 lines what you'll change.
2. **Smallest vertical slice:** do the minimum that satisfies the requirement, then stop. No extras.
3. **Verify:** run it. `curl` the endpoint, run the test, or boot the stack. "Should work" is not done.
4. **Update docs in the same change** (section 8).
5. **Report:** what changed, how you verified it, what's left.

**Definition of Done:**
- [ ] Behaviour matches `docs/REQUIREMENTS.md` **exactly** (field names, status codes, error codes)
- [ ] Backend runs in Docker; mobile runs on the phone/emulator
- [ ] A test exists or was updated (happy path + one failure case)
- [ ] `TRACEABILITY.md` row updated
- [ ] No debug `console.log`, dead code, or new lint errors

---

## 4. How to make decisions

| Size | Examples | What to do |
|---|---|---|
| **Small** | Naming, file placement in your area, helper functions, styling | Decide. Don't ask. |
| **Medium** | New npm dependency, new env var, new DB index, new optional field | Check docs. If not covered, **add it to the docs in the same change** and mention it in your report. |
| **Large** | Change auth approach, DB, framework; break an endpoint's shape; rename an entity; add a new service | **Stop and ask the human.** If approved, add an ADR. |

Default preferences: simplest thing that works, boring popular libraries, fewest moving parts, reversible choices, and something a teammate can explain in the viva in under a minute.

**Time-box:** stuck for ~15 minutes? Stop. Simplify, stub, or ask.

**Ambiguity:** pick the most literal reading, implement it, and record it under "Assumptions" in `docs/REQUIREMENTS.md`.

---

## 5. The API contract is law

- Every endpoint's request fields, response shape, status code, and error code is defined in `docs/REQUIREMENTS.md`.
- **Backend:** return exactly the documented shapes. No extra fields, no renamed fields.
- **Mobile:** send exactly the documented requests and read only documented fields.
- JSON keys are **snake_case end to end** (`due_date`, `created_at`). Do not convert to camelCase.
- **To change the contract: edit `REQUIREMENTS.md` first, then both sides.** Tell the human, because it affects a teammate.
- Never add undocumented endpoints or response fields.

---

## 6. Code conventions

**General:** small functions, early returns, clear names, no premature abstraction. Comments explain *why*.

**Backend (Express)**
- Layers: `routes -> controllers -> services -> db`. No SQL in routes or controllers.
- Validate every request with the zod schemas in `src/validation/`. Return the standard error format.
- Listen on `0.0.0.0`, read `PORT` from env.
- Parameterised SQL only. **Every todo query must filter by `user_id`** (users must never see each other's data).
- Schema + migrations run automatically and idempotently at startup.
- Use `bcryptjs` (pure JS) for password hashing, not native `bcrypt`, because native builds can fail on alpine.
- Register `GET /todos/stats` **before** `GET /todos/:id`.
- Handle `SIGTERM` gracefully.

**Mobile (React Native / Expo)**
- API base URL from `EXPO_PUBLIC_API_URL`. Never `localhost` on a physical phone.
- All network calls live in `src/api/`. Screens never call `fetch` directly.
- Every screen handles loading, empty, and error states, and shows `error.message` from the API.
- On any `401` from a protected endpoint: clear the stored token and go to Login.
- Add `testID`s exactly as listed in `docs/REQUIREMENTS.md` (Appium depends on them).

**Docker**
- `api` waits for `db` with `depends_on: condition: service_healthy`.
- Containers use service names (`db:5432`), never `localhost`.
- Quote ports/numeric strings in YAML, two-space indent, run `docker compose config`.
- Local-only extras go in `docker-compose.override.yml`.

---

## 7. Dependencies

- Ask first: can we do it with what we have? Is it popular and maintained? Does it need native code?
- **Backend:** `npm install <pkg>` in `backend/`, commit `package.json` + `package-lock.json`, rebuild the image.
- **Mobile:** `npx expo install <pkg>` (matches the SDK version). Prefer packages that work in Expo Go. If native code is needed, tell the human because it forces a rebuild.
- **npm only.** Never commit `node_modules`. One dependency change at a time, and tell the team so they can `git pull && npm ci`.

---

## 8. Documentation upkeep (non-negotiable)

| You did this | Update this |
|---|---|
| Added/changed an endpoint, field, error, or rule | `docs/REQUIREMENTS.md` |
| Added a service, env var, folder, or library | `docs/ARCHITECTURE.md` |
| Made a Large decision | `ADR.md` |
| Implemented or tested a requirement | `TRACEABILITY.md` |
| Started, finished, or got blocked | `docs/TASKS.md` |

---

## 9. Working in parallel

- Stay in your assigned area (`backend/`, `mobile/`, `tests/`). Need to edit another area? Tell the human first.
- Shared files (`docker-compose.yml`, `docs/REQUIREMENTS.md`, root-level files) have **one editor at a time**. Check the lock table in `docs/TASKS.md`.
- Pull before starting. Keep changes small.
- Several agents on one machine? Use separate git worktrees or folders.

---

## 10. Things to avoid

- Gold-plating (extra features, animations, refactors nobody asked for).
- Large rewrites in the last 45 minutes of a sprint.
- Silent assumptions, leftover mock data, TODO comments without an owner.
- Reformatting files you didn't need to touch.
- Claiming something works without running it.

---

## 11. Phase awareness

Phase II is revealed on Day 2 and **builds on Phase I code**. Keep modules loosely coupled, migrations additive, and API changes backward compatible (add fields, never rename). Never leave Phase I broken. Never rewrite Day 1 history.

---

## 12. Final-hour checklist (humans run it, agents help)

1. `docker compose down -v && docker compose up --build` works from clean.
2. `GET /health` is OK, tests pass, `docker compose config` is valid.
3. Nothing the stack depends on is uncommitted.
4. Docs are current.
5. Humans push, then confirm the latest commit and the Actions run on GitHub.