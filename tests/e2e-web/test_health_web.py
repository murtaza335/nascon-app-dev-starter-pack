import os
from urllib.parse import urljoin

import pytest
import requests


@pytest.mark.req('REQ-00')
def test_req00_health_in_browser(driver):
    browser_base_url = os.environ.get('BROWSER_BASE_URL', 'http://backend:3000')
    driver.get(urljoin(f'{browser_base_url.rstrip("/")}/', 'health'))
    assert 'ok' in driver.page_source.lower()
