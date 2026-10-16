import pytest


@pytest.mark.mobile
def test_mobile_session_starts(appium_driver):
    assert appium_driver.session_id
