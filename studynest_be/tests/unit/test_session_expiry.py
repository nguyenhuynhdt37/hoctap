from datetime import UTC,datetime,timedelta,timezone
from app.libs.formats.datetime import has_expired,VIETNAM_TIMEZONE


def test_session_aware_expiry_compares_instant_across_timezone():
    now=datetime.now(UTC)
    assert not has_expired(now+timedelta(hours=2))
    assert not has_expired((now+timedelta(hours=2)).astimezone(VIETNAM_TIMEZONE))
    assert has_expired(now-timedelta(seconds=1))
    assert has_expired((now-timedelta(seconds=1)).astimezone(VIETNAM_TIMEZONE))


def test_legacy_naive_app_expiry_is_vietnam_wall_time():
    now=datetime.now(VIETNAM_TIMEZONE).replace(tzinfo=None)
    assert not has_expired(now+timedelta(minutes=2))
    assert has_expired(now-timedelta(minutes=2))
    assert has_expired(None)
