from __future__ import annotations

from uuid import uuid4

import pytest


def make_email(prefix: str) -> str:
    return f'{prefix}-{uuid4().hex[:8]}@example.com'


def register_user(api, email: str, password: str = 'correct-horse'):
    return api.post('/auth/register', json={'email': email, 'password': password})


def login_user(api, email: str, password: str = 'correct-horse'):
    return api.post('/auth/login', json={'email': email, 'password': password})


def auth_headers(token: str) -> dict[str, str]:
    return {'Authorization': f'Bearer {token}'}


@pytest.mark.req('REQ-01')
def test_req01_register_login_and_todo_lifecycle(api):
    email = make_email('lifecycle')

    register = register_user(api, email)
    assert register.status_code == 201
    register_body = register.json()
    assert register_body['user']['email'] == email
    token = register_body['token']

    duplicate = register_user(api, email)
    assert duplicate.status_code == 409
    assert duplicate.json()['error']['code'] == 'CONFLICT'

    login = login_user(api, email)
    assert login.status_code == 200
    login_body = login.json()
    assert login_body['user']['email'] == email
    token = login_body['token']

    create = api.post(
        '/todos',
        json={
            'description': '2 litres, full fat',
            'due_date': '2099-01-05',
            'priority': 'high',
            'title': 'Buy milk',
        },
        headers=auth_headers(token),
    )
    assert create.status_code == 201
    todo = create.json()['todo']
    assert todo['title'] == 'Buy milk'
    assert todo['completed'] is False
    assert todo['priority'] == 'high'
    assert todo['due_date'] == '2099-01-05'

    read_one = api.get(f"/todos/{todo['id']}", headers=auth_headers(token))
    assert read_one.status_code == 200
    assert read_one.json()['todo']['description'] == '2 litres, full fat'

    update = api.patch(
        f"/todos/{todo['id']}",
        json={'completed': True, 'priority': 'low', 'due_date': None, 'title': 'Buy oat milk'},
        headers=auth_headers(token),
    )
    assert update.status_code == 200
    updated = update.json()['todo']
    assert updated['completed'] is True
    assert updated['priority'] == 'low'
    assert updated['due_date'] is None
    assert updated['title'] == 'Buy oat milk'

    stats = api.get('/todos/stats', headers=auth_headers(token))
    assert stats.status_code == 200
    assert stats.json()['stats'] == {'completed': 1, 'overdue': 0, 'pending': 0, 'total': 1}

    delete = api.delete(f"/todos/{todo['id']}", headers=auth_headers(token))
    assert delete.status_code == 204
    assert delete.text == ''

    delete_again = api.delete(f"/todos/{todo['id']}", headers=auth_headers(token))
    assert delete_again.status_code == 404
    assert delete_again.json()['error']['code'] == 'NOT_FOUND'


@pytest.mark.req('REQ-05')
def test_req05_list_filters_search_sort_and_pagination(api):
    email = make_email('listing')
    login = register_user(api, email)
    token = login.json()['token']

    todos = [
        {'title': 'Buy oat milk', 'description': 'pantry', 'priority': 'high', 'due_date': '2099-01-02'},
        {'title': 'Write report', 'description': 'work item', 'priority': 'medium', 'due_date': '2099-01-01'},
        {'title': 'Read a book', 'description': 'leisure', 'priority': 'low', 'due_date': None},
    ]

    for todo in todos:
        response = api.post('/todos', json=todo, headers=auth_headers(token))
        assert response.status_code == 201

    first_page = api.get('/todos', params={'limit': 2, 'page': 1}, headers=auth_headers(token))
    assert first_page.status_code == 200
    first_page_body = first_page.json()
    assert first_page_body['page'] == 1
    assert first_page_body['limit'] == 2
    assert first_page_body['total'] == 3
    assert first_page_body['total_pages'] == 2
    assert len(first_page_body['items']) == 2

    filtered = api.get(
        '/todos',
        params={'completed': 'false', 'priority': 'high', 'q': 'milk', 'sort': 'due_date', 'order': 'asc'},
        headers=auth_headers(token),
    )
    assert filtered.status_code == 200
    filtered_body = filtered.json()
    assert filtered_body['total'] == 1
    assert filtered_body['items'][0]['title'] == 'Buy oat milk'

    sorted_items = api.get(
        '/todos',
        params={'sort': 'priority', 'order': 'asc'},
        headers=auth_headers(token),
    )
    assert sorted_items.status_code == 200
    assert [item['priority'] for item in sorted_items.json()['items']] == ['low', 'medium', 'high']

    last_page = api.get('/todos', params={'limit': 2, 'page': 3}, headers=auth_headers(token))
    assert last_page.status_code == 200
    assert last_page.json()['items'] == []


@pytest.mark.req('REQ-13')
def test_req13_other_users_cannot_read_or_change_todos(api):
    owner_email = make_email('owner')
    intruder_email = make_email('intruder')

    owner_token = register_user(api, owner_email).json()['token']
    intruder_token = register_user(api, intruder_email).json()['token']

    create = api.post(
        '/todos',
        json={'title': 'Private task'},
        headers=auth_headers(owner_token),
    )
    todo_id = create.json()['todo']['id']

    get_foreign = api.get(f'/todos/{todo_id}', headers=auth_headers(intruder_token))
    assert get_foreign.status_code == 404

    patch_foreign = api.patch(f'/todos/{todo_id}', json={'completed': True}, headers=auth_headers(intruder_token))
    assert patch_foreign.status_code == 404

    delete_foreign = api.delete(f'/todos/{todo_id}', headers=auth_headers(intruder_token))
    assert delete_foreign.status_code == 404
