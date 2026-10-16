import pytest


@pytest.mark.req('REQ-00')
def test_req00_health_ok(api):
    response = api.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'
