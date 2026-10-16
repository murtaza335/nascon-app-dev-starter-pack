# Daylight — mobile demo

A native Expo / React Native task workspace with a responsive web preview. **Demo mode only:** no backend requests, account, credentials, or token storage. Sample tasks are seeded relative to the current UTC date. Changes live in memory and reset on reload.

## Run

From `mobile/`, with Node 20.19.4 or newer and npm:

```sh
npm ci
npm start
```

Open with an Expo Go version compatible with SDK 54 on a phone connected to the same network. For a browser, run `npm run web` and open `http://localhost:8081`. `npm run android` opens an available emulator. Physical phone and emulator execution still need team verification; no device was available during implementation.

```sh
npm test
npm run export:web
npx expo export --platform android --output-dir dist-native
```

The production web export is generated under `dist/` and is ignored. No Docker configuration is required or changed for this mobile preview.

Verification during implementation: all five service tests passed; production web export succeeded; Android Hermes bundle export succeeded (606 modules). Android export checks JavaScript/Hermes bundling; it does not compile Gradle, create an APK, or verify device behavior. Browser checks passed for creating, searching, completing, filtering, confirming deletion, deleting, and empty-result recovery. Empty-title and invalid-calendar-date errors were checked in the UI. Visual review passed after fixing statistics layout at 390px and checking the editor at 375px. Screenshots are available locally in the ignored `screenshots/` folder. Physical phone/emulator, native keyboard, large system text, and tablet verification remain pending.

## Implemented experience

- Dashboard, progress, total/completed/pending/overdue counts, and date-relative demo content.
- Create and edit title, description, priority, and optional due date. Calendar validation rejects impossible dates. Title is trimmed and required, up to 200 characters; description up to 1,000 characters.
- Reversible completion, confirmation before deletion, feedback, search across title and description, combined status/priority filters, and four sort fields with ascending/descending order.
- Page controls appear when more than 20 matching tasks exist. Pull to refresh on native. Empty search recovery, loading and error states.
- Phone layout and wide-screen sidebar, high contrast forest/cream palette, labeled controls, keyboard-friendly forms, and minimum 44-point touch targets.

## Structure and dependencies

- `index.js`: Expo entry point.
- `App.js`: dashboard, shared UI components, editor, and dialogs. Plain React hooks manage demo screen state. Safe-area and keyboard handling support native screens.
- `src/api/demo.js`: independent asynchronous local data service; no network calls in screens. Keeps the documented snake_case Todo shapes, list envelope, stats envelope, error code/message/details, and null delete result. Replace this boundary with real HTTP integration later.
- `tests/demo.test.js`: Node's built-in test runner, no test dependency.
- Expo SDK 54, React 19.1, React Native 0.81.5; React DOM and React Native Web for browser preview; `react-native-safe-area-context` for safe device insets; `expo-status-bar` for status bar styling; `@expo/vector-icons` (Feather only) for consistent accessible task affordances. Versions were checked against the installed Expo `bundledNativeModules.json`; npm lockfile captures the resolved dependency tree.

No new service, image, backend endpoint, or environment variable. `EXPO_PUBLIC_API_URL` is intentionally unused until live integration. Navigation between dashboard and task form uses a native modal for the demo; the documented auth/navigation stacks remain future integration work.

## Local task status and traceability

| Requirement | Demo implementation | Verification |
| --- | --- | --- |
| R4, R9 | Create/edit task modal and validation | CRUD happy path and invalid title/date/priority/description tests |
| R5 | Contract-shaped list and pagination | Pagination, empty-page, and final-page deletion recovery tests |
| R6–R8 | Status, priority, text search, sort/order controls | Combined filters, description search, priority/title/date sorting tests |
| R10 | Checkbox completion and reversal | Completion and reversal/statistics tests |
| R11 | Delete dialog, then local deletion | Delete and repeated-delete NOT_FOUND test |
| R12 | Counts and progress refreshed after mutations | Stats invariant and UTC overdue tests |
| R14 | Top-level message and field errors, list error/retry state | Validation failure tests; visual UI verification separately |
| R1–R3, R13 | Deferred: authentication, persistence, and ownership require backend | Not claimed implemented |

Required task-list and task-form `testID`s match root `REQUIREMENTS.md`. `logout-button` is intentionally deferred until a real authenticated session and logout flow exist. Demo information controls have their own accessible labels. Login/register screens and their testIDs are intentionally deferred. Auth, 401 handling, secure token persistence, server error mapping, live endpoint checks, and Appium remain integration tasks.

## Assumptions and handoff

The user's instruction to use demo data and write only inside `mobile/` overrides the usual root documentation edits. Root requirements/architecture/traceability/task files were read where present but **not modified** to avoid conflicts with teammates. The team should sync these local notes into shared docs when coordinating integration. The repository currently keeps the contract at root `REQUIREMENTS.md` / `ARCHITECTURE.md`, rather than the documented `docs/` paths.

Stats compare due dates with UTC today, matching the API contract; the header displays the device's local date. A date-only input avoids timezone conversion and explicitly explains the accepted format. Changes are intentionally transient. No auth bypass or mock network layer is presented as a real backend.

Initial dependency installation reported transitive audit findings (12 moderate, 23 high). No forced dependency upgrades were applied because they may break SDK compatibility; review compatible patches before release.
