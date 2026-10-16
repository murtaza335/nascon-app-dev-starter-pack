# Daylight mobile

Expo / React Native app connected to the documented backend. There is no demo data or in-memory task store. Register or sign in to manage tasks persisted in PostgreSQL.

## Run

Use Node 20.19.4 or newer and npm. Start the configured backend from the repository root with `docker compose up --build -d`.

From `mobile/`:

```sh
npm ci
npm run web
```

The browser preview opens at http://localhost:8081. Leave `EXPO_PUBLIC_API_URL` unset for browser development: the Expo server forwards `/api/*` to `http://127.0.0.1:3000`. If the backend is on another computer, set `API_PROXY_TARGET` to its address before starting Expo. The proxy is development-only and avoids requiring changes to the shared backend's CORS configuration.

For Expo Go on a physical phone, set `EXPO_PUBLIC_API_URL` to `http://<laptop-hotspot-ip>:3000` in `mobile/.env.local`, then run `npm start`. Phone and laptop must share a reachable network. Never use `localhost` for a physical phone. Android emulator uses `http://10.0.2.2:3000`. `.env.example` documents examples; restart Expo after changing configuration. Native startup without a configured URL shows a configuration error rather than silently using the wrong host.

Production web hosting must route `/api/*` to the backend on the same origin, or set `EXPO_PUBLIC_API_URL` to a backend that permits the web origin via CORS. The Expo development proxy is not included in the static web export. No Docker files or backend files were changed.

## Authentication and data

- Register/login send exactly `{email, password}` to `/auth/register` and `/auth/login`.
- Native tokens use `expo-secure-store`. Browser preview uses `sessionStorage` so refresh keeps the session in the same tab; closing the tab ends that browser session. Passwords are never stored.
- Saved tokens are validated with `/auth/me` at startup. Network failures offer retry without discarding the saved token. A protected `401` clears the token and opens Login. Logout also clears storage and unmounts account-specific task state.
- Tasks use `/todos`, `/todos/:id`, and `/todos/stats`. Editing fetches the current record first. Snake_case fields, list/stats envelopes, validation details, and `204` deletion handling follow root `REQUIREMENTS.md`.
- Search (300ms debounce), status/priority filters, sorting, pagination, CRUD and counts all use the server. No fabricated tasks or fallback data. Errors display the server's `error.message`, with field details when supplied.
- Successful writes followed by refresh failure are reported as saved with a refresh prompt, avoiding an accidental duplicate submission. Late list responses and expired responses from an older token cannot overwrite a newer session.

## Structure

- `App.js`: login/register, dashboard, task editor and dialogs; auth gate switches between signed-out and signed-in UI. Task form remains a native modal.
- `src/config.js`: `EXPO_PUBLIC_API_URL`, with `/api` for the web development proxy.
- `src/api/client.js`: JSON requests, bearer tokens, typed errors, 15-second timeout, protected-401 callback.
- `src/api/auth.js`, `todos.js`: documented endpoint adapters; network calls stay out of screens.
- `src/state/AuthContext.js`, `session.js`: session restoration, login/register/logout, stale-session guards.
- `src/state/storage.native.js` / `storage.web.js`: platform-specific token storage.
- `metro.config.js`: dependency-free development proxy, `API_PROXY_TARGET` defaults to `http://127.0.0.1:3000`.
- `tests/`: isolated request/session tests. `integration/`: actual-backend checks using a uniquely generated test account and disposable task; task cleanup runs afterward. Test accounts remain because the API has no account-delete endpoint.

Dependencies remain Expo SDK 54 / React 19.1 / React Native 0.81.5, safe-area-context, status-bar and Feather icons. Added the already documented `expo-secure-store` via `expo install`, including its config plugin and lockfile. Teammates should run `npm ci` in `mobile/` after pulling.

## Verification and local traceability

```sh
npm test
npm run test:integration
npm run export:web
npx expo export --platform android --output-dir dist-native --max-workers 1
```

Integration tests default to `http://127.0.0.1:3000`; set `API_URL` to test another backend. Android export verifies JavaScript/Hermes bundling, not Gradle/APK compilation or device behavior.

Exports use one worker to keep memory use manageable alongside Docker. Run web and Android exports sequentially on this machine; parallel exports exceeded available memory, and both final single-worker exports succeeded.

Verified: 10 isolated tests and the live integration test passed. Web and Android JavaScript exports passed. Browser checks against the actual backend covered registration, invalid-password feedback, login, server title-validation errors, creating a task, restoring the session and saved task after reload, fetching/editing, completing/filtering, confirmed deletion, and logout remaining signed out after reload. The 390px live dashboard and login layouts were visually checked. Disposable UI and integration tasks were deleted after testing.

| Requirement | Live implementation | Verification |
| --- | --- | --- |
| R1–R2 | Register/login screens and API calls, required testIDs | Auth adapter tests, real registration/login and invalid-password case |
| R3 | Secure native token persistence, `/auth/me`, logout, protected-401 handling | Session restore/logout/expiry/race/storage failure tests |
| R4, R9 | Create and fetch/edit task forms | Request contract tests and real CRUD integration |
| R5–R8 | Server pagination, filters, search, sort | Query encoding/empty-filter tests and combined live filter check |
| R10–R12 | PATCH completion, confirmed DELETE, refreshed server stats | Real update/delete/stats, `204` parsing test |
| R14 | API error message/details, timeout/network errors, retry states | Validation/auth/network/invalid-response tests |

All changes are restricted to `mobile/`, as requested. Shared `TRACEABILITY.md`, architecture and task documents were intentionally left for the team's editor to sync from these notes. Actual contract files are at the repository root; the referenced `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, and `docs/TASKS.md` were absent.

Physical phone/emulator, native keyboard and large system text checks remain pending. The existing Expo dependency tree has transitive audit findings; forced SDK-breaking upgrades were not made.
