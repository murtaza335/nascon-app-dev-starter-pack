This file tracks requirement coverage. Use REQ-01 in code comments, commit messages, and test names like test_req01_....

| REQ ID | Requirement (from spec) | Day | Code (file:function) | Test (file::name) | Status |
| --- | --- | --- | --- | --- | --- |
| REQ-00 | Service is healthy | - | backend/src/routes/health.js | tests/api/test_health_api.py::test_req00_health_ok | Done |
| REQ-01 | Register account | - | backend/src/services/auth-service.js:registerUser | tests/api/test_todos_api.py::test_req01_register_login_and_todo_lifecycle | Done |
| REQ-02 | Log in and receive token | - | backend/src/services/auth-service.js:loginUser | tests/api/test_todos_api.py::test_req01_register_login_and_todo_lifecycle | Done |
| REQ-04 | Create a todo | - | backend/src/services/todo-service.js:createTodo | tests/api/test_todos_api.py::test_req01_register_login_and_todo_lifecycle | Done |
| REQ-05 | List todos with pagination | - | backend/src/services/todo-service.js:listTodos | tests/api/test_todos_api.py::test_req05_list_filters_search_sort_and_pagination | Done |
| REQ-06 | Filter todos by status and priority | - | backend/src/services/todo-service.js:listTodos | tests/api/test_todos_api.py::test_req05_list_filters_search_sort_and_pagination | Done |
| REQ-07 | Search todos by text | - | backend/src/services/todo-service.js:listTodos | tests/api/test_todos_api.py::test_req05_list_filters_search_sort_and_pagination | Done |
| REQ-08 | Sort todos | - | backend/src/services/todo-service.js:listTodos | tests/api/test_todos_api.py::test_req05_list_filters_search_sort_and_pagination | Done |
| REQ-09 | View and edit a todo | - | backend/src/services/todo-service.js:getTodo / updateTodo | tests/api/test_todos_api.py::test_req01_register_login_and_todo_lifecycle | Done |
| REQ-10 | Mark a todo complete or incomplete | - | backend/src/services/todo-service.js:updateTodo | tests/api/test_todos_api.py::test_req01_register_login_and_todo_lifecycle | Done |
| REQ-11 | Delete a todo | - | backend/src/services/todo-service.js:deleteTodo | tests/api/test_todos_api.py::test_req01_register_login_and_todo_lifecycle | Done |
| REQ-12 | Summary counts | - | backend/src/services/todo-service.js:getTodoStats | tests/api/test_todos_api.py::test_req01_register_login_and_todo_lifecycle | Done |
| REQ-13 | Never access another user's todos | - | backend/src/services/todo-service.js:getTodo / updateTodo / deleteTodo | tests/api/test_todos_api.py::test_req13_other_users_cannot_read_or_change_todos | Done |

## Coverage check

```bash
grep -rho "REQ-[0-9]\+" backend tests mobile | sort -u
```
