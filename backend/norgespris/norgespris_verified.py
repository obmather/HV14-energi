from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from norgespris_baseline import verify_month_baseline
from norgespris_calendar import local_month
from norgespris_coverage import MeterReading
from norgespris_intervals import classify_interval
from norgespris_monthly import HourInput, HourResult, calculate_month


UTC = timezone.utc
ONE_HOUR = timedelta(hours=1)


def calculate_verified_month(
    *,
    readings: list[MeterReading],
    device_id: str,
    first_hour_utc: datetime,
    end_utc: datetime,
    spot_prices: dict[datetime, Decimal | None],
    valid_from: date,
    valid_to: date,
    fixed_price_nok_kwh: Decimal,
    monthly_limit_kwh: Decimal,
) -> list[HourResult]:
    """
    Calculate Norgespris adjustments using verified meter data.

    The requested period is [first_hour_utc, end_utc).
    All timestamps must identify complete UTC hours.

    Missing or multi-hour consumption is never estimated.
    The calculation covers exactly one local calendar month.
    """

    if first_hour_utc.tzinfo is None or end_utc.tzinfo is None:
        raise ValueError("Timezone-aware boundaries required")

    start = first_hour_utc.astimezone(UTC)
    end = end_utc.astimezone(UTC)

    for boundary in (start, end):
        if boundary != boundary.replace(
            minute=0, second=0, microsecond=0
        ):
            raise ValueError("Boundaries must be whole UTC hours")

    if end <= start:
        raise ValueError("End must be after start")

    # Check the final included hour, not the exclusive end.
    if local_month(start) != local_month(end - ONE_HOUR):
        raise ValueError("One calculation must cover one local month")

    # Never silently reorder or merge readings.
    if any(item.device_id != device_id for item in readings):
        raise ValueError("Mixed meter identities")

    for item in readings:
        if item.measured_at.tzinfo is None:
            raise ValueError("Timezone-aware readings required")

    if any(
        current.measured_at <= previous.measured_at
        for previous, current in zip(readings, readings[1:])
    ):
        raise ValueError("Readings must be strictly chronological")

    def hour_of(timestamp):
        return timestamp.astimezone(UTC).replace(
            minute=0, second=0, microsecond=0
        )

    # Include historical readings only through the first
    # requested hour. This is the baseline, not a forecast.
    baseline_readings = [
        item for item in readings
        if hour_of(item.measured_at) <= start
    ]

    previous_kwh = verify_month_baseline(
        baseline_readings,
        device_id=device_id,
        first_hour_utc=start,
    )

    # Normalize Aidon readings to whole UTC hours (maximum +/- 2 minutes).
    # This follows the existing HV14 Energy hourly-consumption convention.
    from dataclasses import replace

    tolerance = timedelta(minutes=2)
    normalized = {}

    for reading in readings:
        measured = reading.measured_at.astimezone(UTC)
        rounded = (
            measured + timedelta(minutes=30)
        ).replace(minute=0, second=0, microsecond=0)

        deviation = abs(measured - rounded)

        if deviation > tolerance:
            continue

        existing = normalized.get(rounded)

        if existing is None or deviation < existing[0]:
            normalized[rounded] = (
                deviation,
                replace(reading, measured_at=rounded),
            )

    readings = [
        item[1]
        for _, item in sorted(normalized.items())
    ]

    # Build a map of independently verified one-hour intervals.
    # Multi-hour intervals are deliberately not allocated.
    hourly_consumption = {}

    for previous, current in zip(readings, readings[1:]):
        interval = classify_interval(
            previous.measured_at,
            previous.cumulative_kwh,
            current.measured_at,
            current.cumulative_kwh,
        )

        if interval.status != "hourly":
            continue

        hour = hour_of(previous.measured_at)

        if start <= hour < end:
            if hour in hourly_consumption:
                raise ValueError("Duplicate hourly interval")

            hourly_consumption[hour] = interval.total_kwh

    # Explicit period boundaries determine the number of hours.
    # Missing spot prices must not remove hours.
    hours = []
    hour = start

    while hour < end:
        hours.append(HourInput(
            hour_start=hour,
            consumption_kwh=hourly_consumption.get(hour),
            spot_price_nok_kwh=spot_prices.get(hour),
        ))
        hour += ONE_HOUR

    return calculate_month(
        hours,
        valid_from=valid_from,
        valid_to=valid_to,
        fixed_price_nok_kwh=fixed_price_nok_kwh,
        monthly_limit_kwh=monthly_limit_kwh,
        verified_previous_kwh=previous_kwh,
    )
