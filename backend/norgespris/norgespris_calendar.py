from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo


OSLO = ZoneInfo("Europe/Oslo")
UTC = timezone.utc


def local_month(hour_start: datetime) -> tuple[int, int]:
    if hour_start.tzinfo is None:
        raise ValueError("Timezone-aware datetime required")

    local = hour_start.astimezone(OSLO)
    return local.year, local.month


def agreement_applies(
    hour_start: datetime,
    valid_from: date,
    valid_to: date,
) -> bool:
    if hour_start.tzinfo is None:
        raise ValueError("Timezone-aware datetime required")

    if valid_to < valid_from:
        raise ValueError("Invalid agreement dates")

    local_date = hour_start.astimezone(OSLO).date()
    return valid_from <= local_date <= valid_to


def utc_hours_in_local_day(day: date) -> list[datetime]:
    start_local = datetime(
        day.year, day.month, day.day,
        tzinfo=OSLO,
    )

    next_day = day + timedelta(days=1)

    end_local = datetime(
        next_day.year, next_day.month, next_day.day,
        tzinfo=OSLO,
    )

    current = start_local.astimezone(UTC)
    end = end_local.astimezone(UTC)

    hours = []

    while current < end:
        hours.append(current)
        current += timedelta(hours=1)

    return hours
