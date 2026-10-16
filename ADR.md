This file uses lightweight ADR stubs. Keep each ADR to 5-8 lines. You must defend these verbally in the viva.

1. ADR-001
Status: Proposed
Date: 2026-10-16
Context: We need a backend framework that is fast to scaffold and easy to reason about under time pressure.
Decision: Use Express for the Node backend.
Consequences: + Small surface area; + familiar middleware model; - fewer built-in opinions than larger frameworks.
Requirements linked: backend runtime, health endpoint, container startup.

2. ADR-002
Status: Proposed
Date: 2026-10-16
Context: The competition domain is unknown until the day, but the starter still needs a database path.
Decision: Use PostgreSQL with a simple SQL-first approach and create tables at startup when needed.
Consequences: + Portable; + easy to validate in compose; - schema work must stay disciplined.
Requirements linked: postgres service, example CRUD, health checks.

3. ADR-003
Status: Proposed
Date: 2026-10-16
Context: Some tasks may benefit from short-lived cache or rate-limiting support.
Decision: Use Redis as the default cache service and keep cache access behind a tiny helper.
Consequences: + Low operational complexity; + easy to disable; - adds another dependency to manage.
Requirements linked: redis service, health probe, backend startup.

4. ADR-004
Status: Proposed
Date: 2026-10-16
Context: The grader needs a consistent API response shape for smoke tests and future feature work.
Decision: Standardize on JSON error responses and explicit health payloads.
Consequences: + Predictable test assertions; + easier debugging; - every route must preserve the contract.
Requirements linked: /health, /api/items, API tests.

5. ADR-005
Status: Proposed
Date: 2026-10-16
Context: Mobile work is Android-only and time-boxed, so the starter must avoid over-scaffolding.
Decision: Keep React Native as the mobile stack but do not scaffold the app in this repo.
Consequences: + No waste before the domain is known; - first-day mobile setup still requires manual bootstrap.
Requirements linked: mobile docs, physical phone workflow.

6. ADR-006
Status: Proposed
Date: 2026-10-16
Context: The competition may or may not require authentication, and it is easy to overdesign early.
Decision: Leave authentication out of the starter and add it only when the day-of spec requires it.
Consequences: + Less noise; + faster first tests; - a future auth requirement will need a deliberate implementation.
Requirements linked: app skeleton, example routes, traceability.

7. ADR-007
Status: Proposed
Date: 2026-10-16
Context: The team needs confidence that the repo still works after every change.
Decision: Use layered testing: API, browser smoke, mobile smoke, and perf smoke.
Consequences: + Fast feedback; + clear failure locality; - more tooling to keep aligned.
Requirements linked: tests/, CI, compose test override.

8. ADR-008
Status: Proposed
Date: 2026-10-16
Context: The autograder, local machines, and mobile team all need repeatable startup rules.
Decision: Make Docker Compose the source of truth for backend services and health gates.
Consequences: + Same startup everywhere; + easier grading; - compose files must stay conservative and pinned.
Requirements linked: docker-compose.yml, health checks, scripts.
