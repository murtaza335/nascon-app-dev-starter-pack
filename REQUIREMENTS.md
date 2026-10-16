# REQUIREMENTS.md: To-Do App (Features and API Contract)

> **Source of truth for WHAT we build.** Backend, mobile, and tests all build against this file.
> Change this file FIRST, then the code. Requirement IDs (R1, R2, ...) are used in `TRACEABILITY.md`.

---

## 1. Overview

- **Problem:** A personal to-do app. Users sign up, log in, and manage their own tasks from a mobile app.
- **Users:** one role, a registered user. Each user sees only their own todos.
- **Phase:** I

## 2. Functional requirements

| ID | Requirement | Endpoint(s) | Priority | Area | Status |
|----|-------------|-------------|----------|------|--------|
| R1 | A visitor can register with email and password | E2 | Must | BE + Mobile | Todo |
| R2 | A user can log in and receive a token | E3 | Must | BE + Mobile | Todo |
| R3 | The app keeps the user logged in across restarts and supports logout | E4 | Must | Mobile | Todo |
| R4 | A user can create a todo (title, description, priority, due date) | E6 | Must | BE + Mobile | Todo |
| R5 | A user can list their todos, paginated | E5 | Must | BE + Mobile | Todo |
| R6 | A user can filter the list by completed status and priority | E5 | Must | BE + Mobile | Todo |
| R7 | A user can search todos by text (title or description) | E5 | Should | BE + Mobile | Todo |
| R8 | A user can sort the list (created date, due date, priority, title) | E5 | Should | BE + Mobile | Todo |
| R9 | A user can view and edit a todo | E7, E8 | Must | BE + Mobile | Todo |
| R10 | A user can mark a todo complete or incomplete | E8 | Must | BE + Mobile | Todo |
| R11 | A user can delete a todo | E9 | Must | BE + Mobile | Todo |
| R12 | A user can see summary counts (total, completed, pending, overdue) | E10 | Should | BE + Mobile | Todo |
| R13 | A user can never read, change, or delete another user's todos | E5-E10 | Must | BE | Todo |
| R14 | Validation and server errors are shown clearly in the app | all | Must | Mobile | Todo |

## 3. Non-functional requirements

| ID | Requirement | How we meet it |
|----|-------------|----------------|
| N1 | Whole system starts with `docker compose up --build` and needs no manual steps | Compose healthchecks, auto-migrate on startup |
| N2 | Health endpoint available | E1 |
| N3 | Passwords are never stored or returned in plain text | `bcryptjs` hash, `password_hash` never in responses |
| N4 | List endpoint stays fast under light load | Index on `(user_id, completed)`, pagination capped at 100 |
| N5 | Consistent error format on every failure | One error-handling middleware |

---

## 4. Data model

### users
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | integer |
| email | VARCHAR(254) | UNIQUE, NOT NULL, stored lowercase and trimmed |
| password_hash | TEXT | NOT NULL, never returned |
| created_at | TIMESTAMPTZ | default `now()` |

### todos
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | integer |
| user_id | INTEGER | FK -> users(id) ON DELETE CASCADE, NOT NULL |
| title | VARCHAR(200) | NOT NULL |
| description | TEXT | NOT NULL, default `''`, max 1000 chars |
| completed | BOOLEAN | NOT NULL, default `false` |
| priority | VARCHAR(6) | NOT NULL, default `'medium'`, CHECK in (`low`,`medium`,`high`) |
| due_date | DATE | NULL allowed |
| created_at | TIMESTAMPTZ | default `now()` |
| updated_at | TIMESTAMPTZ | default `now()`, set on every update |

Index: `CREATE INDEX IF NOT EXISTS idx_todos_user_completed ON todos(user_id, completed);`

Relation: one user has many todos.

---

## 5. API contract

### 5.1 Global conventions (apply to every endpoint)

- **Base URL:** `http://<host>:3000` (mobile reads it from `EXPO_PUBLIC_API_URL`)
- **Format:** JSON in, JSON out. Requests with a body must send `Content-Type: application/json`.
- **Keys:** `snake_case` everywhere.
- **Auth:** protected endpoints require the header `Authorization: Bearer <token>`. Public endpoints: E1, E2, E3.
- **IDs:** integers. **Timestamps:** ISO-8601 UTC strings (`2026-10-17T06:15:00.000Z`). **Dates:** `YYYY-MM-DD`.
- **Check order:** authentication (401) -> path/query/body validation (400) -> existence and ownership (404) -> conflicts (409).
- **Unknown body fields are rejected** with `400 VALIDATION_ERROR`.
- **Unknown routes** return `404 NOT_FOUND` in the standard error format.
- Success bodies are always **objects** (never bare arrays), with the resource under a named key (`todo`, `user`, `stats`, `items`).

### 5.2 Standard error format (every error, no exceptions)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "title", "message": "title is required" }
    ]
  }
}
```

- `code`: machine-readable (table below). `message`: human-readable, safe to show in the UI.
- `details`: array. Filled only for `VALIDATION_ERROR`; otherwise `[]`.

| HTTP | code | When |
|------|------|------|
| 400 | `VALIDATION_ERROR` | Bad or missing body/query/path input, unknown fields, malformed JSON |
| 401 | `UNAUTHORIZED` | Missing, invalid, or expired token; wrong email or password |
| 404 | `NOT_FOUND` | Todo doesn't exist **or belongs to another user**; unknown route |
| 409 | `CONFLICT` | Email already registered |
| 500 | `INTERNAL_ERROR` | Unexpected server error (message is generic, never leaks internals) |

### 5.3 Shared object shapes

**User**
```json
{ "id": 1, "email": "sara@example.com", "created_at": "2026-10-17T06:15:00.000Z" }
```

**Todo**
```json
{
  "id": 12,
  "title": "Buy milk",
  "description": "2 litres, full fat",
  "completed": false,
  "priority": "medium",
  "due_date": "2026-10-20",
  "created_at": "2026-10-17T06:15:00.000Z",
  "updated_at": "2026-10-17T06:15:00.000Z"
}
```

Reference types (notation only; use them as documentation, whatever language you code in):

```ts
type User = { id: number; email: string; created_at: string };
type Priority = "low" | "medium" | "high";
type Todo = {
  id: number; title: string; description: string; completed: boolean;
  priority: Priority; due_date: string | null; created_at: string; updated_at: string;
};
type ApiError = { error: { code: string; message: string; details: { field: string; message: string }[] } };
```

The Todo object **never** contains `user_id`. The User object **never** contains `password_hash`.

### 5.4 Endpoint index

| # | Method | Path | Auth | Purpose | Req |
|---|--------|------|------|---------|-----|
| E1 | GET | `/health` | Public | Liveness + DB check | N2 |
| E2 | POST | `/auth/register` | Public | Create account, return token | R1 |
| E3 | POST | `/auth/login` | Public | Log in, return token | R2 |
| E4 | GET | `/auth/me` | Bearer | Current user (validates stored token) | R3 |
| E5 | GET | `/todos` | Bearer | List my todos (filter, search, sort, paginate) | R5-R8 |
| E6 | POST | `/todos` | Bearer | Create a todo | R4 |
| E7 | GET | `/todos/:id` | Bearer | Get one todo | R9 |
| E8 | PATCH | `/todos/:id` | Bearer | Partially update a todo (incl. complete/incomplete) | R9, R10 |
| E9 | DELETE | `/todos/:id` | Bearer | Delete a todo | R11 |
| E10 | GET | `/todos/stats` | Bearer | Summary counts | R12 |

> Route order: `/todos/stats` must be registered **before** `/todos/:id`.

---

### E1: `GET /health`

- **Auth:** none
- **Request:** nothing
- **200 OK**
  ```json
  { "status": "ok" }
  ```
- **503 Service Unavailable** (DB query failed). This is the only non-standard error shape:
  ```json
  { "status": "error" }
  ```

---

### E2: `POST /auth/register`

- **Auth:** none
- **Request body**

  | Field | Type | Required | Rules |
  |-------|------|----------|-------|
  | `email` | string | yes | valid email format, max 254 chars; trimmed and lowercased before saving |
  | `password` | string | yes | 8 to 72 characters |

  ```json
  { "email": "Sara@Example.com", "password": "correct-horse" }
  ```

- **201 Created**
  ```json
  {
    "user": { "id": 1, "email": "sara@example.com", "created_at": "2026-10-17T06:15:00.000Z" },
    "token": "<jwt>"
  }
  ```
- **Errors**

  | Status | code | When |
  |--------|------|------|
  | 400 | `VALIDATION_ERROR` | missing/invalid email, password too short/long, unknown field |
  | 409 | `CONFLICT` | email already registered (message: `"Email already registered"`) |

- **Rules:** password hashed with `bcryptjs` (10 rounds). Token is a JWT signed with `JWT_SECRET`, payload `{ "sub": <user id> }`, expires in 24h.

---

### E3: `POST /auth/login`

- **Auth:** none
- **Request body**

  | Field | Type | Required | Rules |
  |-------|------|----------|-------|
  | `email` | string | yes | non-empty; compared case-insensitively |
  | `password` | string | yes | non-empty |

  ```json
  { "email": "sara@example.com", "password": "correct-horse" }
  ```

- **200 OK** (same shape as E2)
  ```json
  {
    "user": { "id": 1, "email": "sara@example.com", "created_at": "2026-10-17T06:15:00.000Z" },
    "token": "<jwt>"
  }
  ```
- **Errors**

  | Status | code | When |
  |--------|------|------|
  | 400 | `VALIDATION_ERROR` | missing fields, unknown field |
  | 401 | `UNAUTHORIZED` | unknown email **or** wrong password (same message for both: `"Invalid email or password"`) |

---

### E4: `GET /auth/me`

- **Auth:** Bearer
- **Request:** no body
- **200 OK**
  ```json
  { "user": { "id": 1, "email": "sara@example.com", "created_at": "2026-10-17T06:15:00.000Z" } }
  ```
- **Errors:** `401 UNAUTHORIZED` (missing, malformed, invalid, or expired token; or the user no longer exists)

---

### E5: `GET /todos`

- **Auth:** Bearer
- **Request:** no body. All query params are optional.

  | Query param | Type | Default | Rules |
  |-------------|------|---------|-------|
  | `completed` | `"true"` \| `"false"` | (no filter) | filters by completion |
  | `priority` | `"low"` \| `"medium"` \| `"high"` | (no filter) | filters by priority |
  | `q` | string | (no filter) | 1-100 chars; case-insensitive substring match on `title` OR `description` |
  | `sort` | `"created_at"` \| `"due_date"` \| `"priority"` \| `"title"` | `created_at` | `priority` sorts low < medium < high; todos with null `due_date` always come last |
  | `order` | `"asc"` \| `"desc"` | `desc` | |
  | `page` | integer >= 1 | `1` | |
  | `limit` | integer 1-100 | `20` | |

  Example: `GET /todos?completed=false&priority=high&q=milk&sort=due_date&order=asc&page=1&limit=20`

- **200 OK**
  ```json
  {
    "items": [
      {
        "id": 12, "title": "Buy milk", "description": "2 litres, full fat",
        "completed": false, "priority": "high", "due_date": "2026-10-20",
        "created_at": "2026-10-17T06:15:00.000Z", "updated_at": "2026-10-17T06:15:00.000Z"
      }
    ],
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
  ```
  - `total` = number of todos matching the filters (not just this page).
  - `total_pages` = `ceil(total / limit)`, and `0` when `total` is `0`.
  - A page beyond the last returns `items: []` with status 200.
  - Only the caller's todos are ever included.
- **Errors**

  | Status | code | When |
  |--------|------|------|
  | 400 | `VALIDATION_ERROR` | any invalid query value (e.g. `limit=500`, `completed=maybe`) |
  | 401 | `UNAUTHORIZED` | missing/invalid token |

---

### E6: `POST /todos`

- **Auth:** Bearer
- **Request body**

  | Field | Type | Required | Default | Rules |
  |-------|------|----------|---------|-------|
  | `title` | string | **yes** | | trimmed, 1-200 chars |
  | `description` | string | no | `""` | max 1000 chars |
  | `priority` | `"low"` \| `"medium"` \| `"high"` | no | `"medium"` | |
  | `due_date` | string \| null | no | `null` | valid calendar date `YYYY-MM-DD` |

  `completed` is **not accepted** on create (a new todo is always `false`); sending it is a 400.

  ```json
  { "title": "Buy milk", "description": "2 litres, full fat", "priority": "high", "due_date": "2026-10-20" }
  ```

- **201 Created**
  ```json
  {
    "todo": {
      "id": 12, "title": "Buy milk", "description": "2 litres, full fat",
      "completed": false, "priority": "high", "due_date": "2026-10-20",
      "created_at": "2026-10-17T06:15:00.000Z", "updated_at": "2026-10-17T06:15:00.000Z"
    }
  }
  ```
- **Errors**

  | Status | code | When |
  |--------|------|------|
  | 400 | `VALIDATION_ERROR` | missing/empty title, title > 200, bad priority, bad date, unknown field |
  | 401 | `UNAUTHORIZED` | missing/invalid token |

---

### E7: `GET /todos/:id`

- **Auth:** Bearer
- **Path param:** `id` = positive integer
- **Request:** no body
- **200 OK**
  ```json
  { "todo": { "id": 12, "title": "Buy milk", "description": "2 litres, full fat", "completed": false, "priority": "high", "due_date": "2026-10-20", "created_at": "2026-10-17T06:15:00.000Z", "updated_at": "2026-10-17T06:15:00.000Z" } }
  ```
- **Errors**

  | Status | code | When |
  |--------|------|------|
  | 400 | `VALIDATION_ERROR` | `id` is not a positive integer |
  | 401 | `UNAUTHORIZED` | missing/invalid token |
  | 404 | `NOT_FOUND` | no such todo **or it belongs to someone else** (never 403) |

---

### E8: `PATCH /todos/:id`

- **Auth:** Bearer
- **Path param:** `id` = positive integer
- **Request body:** partial update. **At least one** field required. Only the fields sent are changed.

  | Field | Type | Rules |
  |-------|------|-------|
  | `title` | string | trimmed, 1-200 chars |
  | `description` | string | max 1000 chars |
  | `completed` | boolean | `true` / `false` (JSON booleans, not strings) |
  | `priority` | `"low"` \| `"medium"` \| `"high"` | |
  | `due_date` | string \| null | `YYYY-MM-DD`, or `null` to clear it |

  Mark complete:
  ```json
  { "completed": true }
  ```
  Edit several fields:
  ```json
  { "title": "Buy oat milk", "priority": "low", "due_date": null }
  ```

- **200 OK:** the full updated todo; `updated_at` is refreshed.
  ```json
  {
    "todo": {
      "id": 12, "title": "Buy oat milk", "description": "2 litres, full fat",
      "completed": true, "priority": "low", "due_date": null,
      "created_at": "2026-10-17T06:15:00.000Z", "updated_at": "2026-10-17T07:02:11.000Z"
    }
  }
  ```
- **Errors**

  | Status | code | When |
  |--------|------|------|
  | 400 | `VALIDATION_ERROR` | empty body `{}`, invalid value, unknown field, bad `id` |
  | 401 | `UNAUTHORIZED` | missing/invalid token |
  | 404 | `NOT_FOUND` | no such todo or not yours |

---

### E9: `DELETE /todos/:id`

- **Auth:** Bearer
- **Path param:** `id` = positive integer
- **Request:** no body
- **204 No Content:** empty body (do not try to parse JSON on the client)
- **Errors**

  | Status | code | When |
  |--------|------|------|
  | 400 | `VALIDATION_ERROR` | `id` is not a positive integer |
  | 401 | `UNAUTHORIZED` | missing/invalid token |
  | 404 | `NOT_FOUND` | no such todo or not yours (so deleting twice returns 404 the second time) |

---

### E10: `GET /todos/stats`

- **Auth:** Bearer
- **Request:** no body, no query params
- **200 OK**
  ```json
  { "stats": { "total": 10, "completed": 4, "pending": 6, "overdue": 2 } }
  ```
  - `total` = all of my todos. `completed` = `completed = true`. `pending` = `completed = false`.
  - `overdue` = `completed = false` AND `due_date` is earlier than today (server date, UTC).
  - Invariant: `total = completed + pending`. All values are integers, `0` when there are no todos.
- **Errors:** `401 UNAUTHORIZED`

---

## 6. Mobile screens and flows

| Screen | Purpose | Endpoints | Req |
|--------|---------|-----------|-----|
| **Login** | Email + password sign in; link to Register | E3 | R2, R14 |
| **Register** | Create account | E2 | R1, R14 |
| **Todo List** (home) | Shows stats bar, search box, filter chips (All / Pending / Completed), priority filter, sort option, the list with a checkbox, infinite scroll or "load more", pull-to-refresh, logout button, add button | E4 (on launch), E5, E8 (checkbox), E9, E10 | R3, R5-R8, R10-R12 |
| **Todo Form** (create / edit) | Title, description, priority, due date; Save | E6 (create), E7 + E8 (edit) | R4, R9, R14 |

Flows:
- **Launch:** read stored token -> if none go to Login; else call E4 -> on success go to Todo List, on 401 clear token and go to Login.
- **Auth success** (E2/E3): store the token, go to Todo List.
- **Logout:** clear the token, go to Login.
- **Any 401** on a protected call: clear the token, go to Login.
- **Validation errors (400):** show `error.message` at the top of the form and, where possible, `details[].message` under the matching field.
- **Empty list:** show an empty-state message with the add button.
- **Delete:** confirm with a dialog, call E9, remove the item locally, then refresh stats.
- **After create/edit/toggle/delete:** refresh the list and stats (E5, E10).

### Required `testID`s (Appium relies on these exactly)

| Screen | testID | Element |
|--------|--------|---------|
| Login | `login-email-input`, `login-password-input`, `login-submit`, `login-error`, `goto-register-link` | inputs, button, error text, link |
| Register | `register-email-input`, `register-password-input`, `register-submit`, `register-error` | inputs, button, error text |
| Todo List | `todo-list` | the list container |
| | `todo-item-{id}` | each row |
| | `todo-title-{id}` | title text in each row |
| | `todo-checkbox-{id}` | complete toggle in each row |
| | `todo-delete-{id}` | delete button in each row |
| | `add-todo-button`, `logout-button` | buttons |
| | `search-input` | search box |
| | `filter-all`, `filter-pending`, `filter-completed` | status filter chips |
| | `stats-total`, `stats-completed`, `stats-pending`, `stats-overdue` | counts |
| | `empty-state`, `loading-indicator`, `error-banner` | states |
| Todo Form | `todo-title-input`, `todo-description-input`, `todo-due-date-input` | inputs |
| | `priority-low`, `priority-medium`, `priority-high` | priority options |
| | `todo-save-button`, `todo-form-error` | button, error text |

## 7. Real-time / background

None. Plain request/response. Refresh on pull-to-refresh and after each action.

## 8. Out of scope

Password reset, email verification, refresh tokens, categories/tags, sharing or collaboration, attachments, push notifications, offline mode, dark mode, i18n. **Do not build these.**

## 9. Assumptions

- A1: Todo `id` and `user.id` are integers.
- A2: `due_date` is a date only (no time of day), compared against the server's UTC date.
- A3: Tokens are valid for 24h, with no refresh. When it expires the user logs in again.
- A4: Accessing another user's todo returns 404, not 403, so ids can't be probed.
- A5: Email uniqueness is case-insensitive because emails are lowercased on save.
- A6: Mobile stores the token in `expo-secure-store`.

## 10. Open questions for the organizers

- Q1: Does the autograder need specific ports, paths, or an APK/IPA artifact?
- Q2: Is the mobile app expected to be tested via Appium against an installed build (not Expo Go)?