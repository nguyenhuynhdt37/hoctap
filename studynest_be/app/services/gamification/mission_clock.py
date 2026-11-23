from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

VIETNAM = ZoneInfo("Asia/Ho_Chi_Minh")


def daily_window(now: datetime) -> tuple[date, datetime, datetime]:
    day = now.astimezone(VIETNAM).date()
    start = datetime.combine(day, time.min, tzinfo=VIETNAM)
    return day, start, start + timedelta(days=1)
