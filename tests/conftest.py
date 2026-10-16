import os
from pathlib import Path
from urllib.parse import urljoin

import pytest
import requests
from appium import webdriver as appium_webdriver
from appium.options.android import UiAutomator2Options
from selenium import webdriver
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.chrome.options import Options as ChromeOptions

REQ_IDS = set()


class ApiClient(requests.Session):
    def __init__(self, base_url: str, timeout: float = 10.0) -> None:
        super().__init__()
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout

    def request(self, method, url, **kwargs):
        if not url.startswith(('http://', 'https://')):
            url = urljoin(f'{self.base_url}/', url.lstrip('/'))
        kwargs.setdefault('timeout', self.timeout)
        return super().request(method, url, **kwargs)


def pytest_configure(config):
    config.addinivalue_line('markers', 'req(id): traceability requirement marker')
    config._req_ids_seen = set()
    config._req_ids_by_nodeid = {}


def pytest_collection_modifyitems(config, items):
    req_map = {}
    for item in items:
        reqs = {marker.args[0] for marker in item.iter_markers(name='req') if marker.args}
        if reqs:
            req_map[item.nodeid] = reqs
    config._req_ids_by_nodeid = req_map


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if report.when != 'call':
        return
    req_map = getattr(item.config, '_req_ids_by_nodeid', {})
    seen = getattr(item.config, '_req_ids_seen', set())
    for req_id in req_map.get(item.nodeid, set()):
        REQ_IDS.add(req_id)
        seen.add(req_id)
    item.config._req_ids_seen = seen


@pytest.fixture(scope='session')
def base_url():
    return os.environ.get('BASE_URL', 'http://localhost:3000')


@pytest.fixture(scope='session')
def api(base_url):
    client = ApiClient(base_url)
    yield client
    client.close()


@pytest.fixture(scope='session')
def driver():
    selenium_url = os.environ.get('SELENIUM_URL', 'http://localhost:4444')
    try:
        requests.get(urljoin(f'{selenium_url.rstrip("/")}/', 'status'), timeout=2)
    except requests.RequestException as exc:
        pytest.skip(f'Selenium hub is unavailable: {exc}')

    options = ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')

    try:
        remote = webdriver.Remote(command_executor=selenium_url, options=options)
    except WebDriverException as exc:
        pytest.skip(f'Selenium driver could not start: {exc}')

    try:
        yield remote
    finally:
        remote.quit()


@pytest.fixture(scope='session')
def appium_driver():
    appium_url = os.environ.get('APPIUM_URL', 'http://localhost:4723')
    app_path = os.environ.get('APP_PATH')
    if not app_path:
        pytest.skip('APP_PATH is not set')

    if not Path(app_path).exists():
        pytest.skip(f'APP_PATH does not exist: {app_path}')

    try:
        requests.get(urljoin(f'{appium_url.rstrip("/")}/', 'status'), timeout=2)
    except requests.RequestException as exc:
        pytest.skip(f'Appium server is unavailable: {exc}')

    options = UiAutomator2Options()
    options.platform_name = 'Android'
    options.automation_name = 'UiAutomator2'
    options.app = app_path

    try:
        remote = appium_webdriver.Remote(command_executor=appium_url, options=options)
    except Exception as exc:  # pragma: no cover - fixture is environment-dependent
        pytest.skip(f'Appium session could not start: {exc}')

    try:
        yield remote
    finally:
        remote.quit()


def pytest_sessionfinish(session, exitstatus):
    touched = getattr(session.config, '_req_ids_seen', set())
    if touched:
        print('REQ IDs touched:', ', '.join(sorted(touched)))
    else:
        print('REQ IDs touched: none')
