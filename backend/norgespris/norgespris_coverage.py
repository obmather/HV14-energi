from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal

from norgespris_intervals import classify_interval
from norgespris_consumption import summarize_intervals


@dataclass(frozen=True)
class MeterReading:
    device_id: str
    measured_at: datetime
    cumulative_kwh: Decimal


@dataclass(frozen=True)
class CoverageResult:
    status: str
    total_kwh: Decimal | None
    hourly_kwh: Decimal | None
    unallocated_kwh: Decimal | None
    unallocated_hours: int


def incomplete() -> CoverageResult:
    return CoverageResult(
        status="incomplete",
        total_kwh=None,
        hourly_kwh=None,
        unallocated_kwh=None,
        unallocated_hours=0,
    )


def utc_hour(timestamp: datetime) -> datetime:
    if timestamp.tzinfo is None:
        raise ValueError("Timezone-aware timestamps required")

    return timestamp.astimezone(timezone.utc).replace(
        minute=0,
        second=0,
        microsecond=0,
    )


def verify_coverage(
    readings: list[MeterReading],
    *,
    device_id: str,
    start_utc: datetime,
    end_utc: datetime,
) -> CoverageResult:
    """
    Verify cumulative meter coverage for a requested UTC period.

    Multi-hour intervals preserve documented total consumption.
    They do not provide individual hourly consumption.

    This function does not establish complete calendar-month
    coverage unless the requested boundaries are the actual
    local-month boundaries converted to UTC.
    """

    if not readings or len(readings) < 2:
        return incomplete()

    if (
        start_utc.tzinfo is None
        or end_utc.tzinfo is None
    ):
        raise ValueError("Timezone-aware boundaries required")

    start = start_utc.astimezone(timezone.utc)
    end = end_utc.astimezone(timezone.utc)

    if end <= start:
        raise ValueError("End must be after start")

    if utc_hour(start) != start or utc_hour(end) != end:
        raise ValueError("Boundaries must be whole UTC hours")

    if any(item.device_id != device_id for item in readings):
        return incomplete()

    try:
        first_hour = utc_hour(readings[0].measured_at)
        last_hour = utc_hour(readings[-1].measured_at)
    except ValueError:
        return incomplete()

    if first_hour != start or last_hour != end:
        return incomplete()

    intervals = []

    for previous, current in zip(readings, readings[1:]):
        try:
            result = classify_interval(
                previous.measured_at,
                previous.cumulative_kwh,
                current.measured_at,
                current.cumulative_kwh,
            )
        except (ValueError, TypeError):
            return incomplete()

        if result.status not in ("hourly", "multi_hour"):
            return incomplete()

        intervals.append(result)

    summary = summarize_intervals(intervals)

    if summary.status != "complete":
        return incomplete()

    return CoverageResult(
        status="complete",
        total_kwh=summary.total_kwh,
        hourly_kwh=summary.hourly_kwh,
        unallocated_kwh=summary.unallocated_kwh,
        unallocated_hours=summary.unallocated_hours,
    )
