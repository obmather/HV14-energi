from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal


@dataclass(frozen=True)
class IntervalResult:
    status: str
    total_kwh: Decimal | None
    hours: int | None


def classify_interval(
    previous_at: datetime,
    previous_kwh: Decimal,
    current_at: datetime,
    current_kwh: Decimal,
) -> IntervalResult:
    """
    Classify an interval between cumulative meter readings.

    Hourly intervals provide consumption for one hour.
    Multi-hour intervals preserve the documented total,
    without estimating individual hourly consumption.
    """

    if previous_at.tzinfo is None or current_at.tzinfo is None:
        raise ValueError("Timestamps must be timezone-aware")

    previous_at = previous_at.astimezone(timezone.utc)
    current_at = current_at.astimezone(timezone.utc)

    elapsed = current_at - previous_at

    if elapsed <= timedelta(0):
        return IntervalResult(
            "invalid_duration", None, None
        )

    if current_kwh < previous_kwh:
        return IntervalResult(
            "counter_decrease", None, None
        )

    total_kwh = current_kwh - previous_kwh

    elapsed_seconds = elapsed.total_seconds()
    nearest_hours = round(elapsed_seconds / 3600)

    if nearest_hours < 1:
        return IntervalResult(
            "invalid_duration", None, None
        )

    expected = timedelta(hours=nearest_hours)

    if abs(elapsed - expected) > timedelta(minutes=5):
        return IntervalResult(
            "invalid_duration", None, None
        )

    def seconds_after_utc_hour(timestamp):
        hour_start = timestamp.replace(
            minute=0,
            second=0,
            microsecond=0,
        )
        return (timestamp - hour_start).total_seconds()

    if (
        seconds_after_utc_hour(previous_at) > 120
        or seconds_after_utc_hour(current_at) > 120
    ):
        return IntervalResult(
            "invalid_alignment", None, None
        )

    if nearest_hours == 1:
        return IntervalResult(
            "hourly",
            total_kwh,
            1,
        )

    return IntervalResult(
        "multi_hour",
        total_kwh,
        nearest_hours,
    )
