from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from norgespris_repository import (
    parse_meter_readings,
    parse_spot_prices,
    parse_agreement,
    select_agreement_for_period,
)

UTC = timezone.utc
OSLO = ZoneInfo("Europe/Oslo")
ONE_HOUR = timedelta(hours=1)
READING_TOLERANCE = timedelta(seconds=120)


def validate_period(start_utc, end_utc):
    if (
        not isinstance(start_utc, datetime)
        or not isinstance(end_utc, datetime)
        or start_utc.tzinfo is None
        or end_utc.tzinfo is None
    ):
        raise ValueError("Timezone-aware datetimes required")

    start = start_utc.astimezone(UTC)
    end = end_utc.astimezone(UTC)

    for value in (start, end):
        if value != value.replace(
            minute=0, second=0, microsecond=0
        ):
            raise ValueError("Whole UTC hours required")

    if end <= start:
        raise ValueError("Invalid period")

    first_local = start.astimezone(OSLO)
    last_local = (end - ONE_HOUR).astimezone(OSLO)

    if (
        first_local.year,
        first_local.month,
    ) != (
        last_local.year,
        last_local.month,
    ):
        raise ValueError("Period crosses local month")

    month_start_local = datetime(
        first_local.year,
        first_local.month,
        1,
        tzinfo=OSLO,
    )

    return (
        start,
        end,
        month_start_local.astimezone(UTC),
    )


def fetch_meter_readings(
    cursor,
    *,
    device_id,
    month_start_utc,
    end_utc,
):
    cursor.execute(
        """
        SELECT
            d.device_id,
            m.measured_at,
            m.value AS cumulative_kwh,
            m.quality,
            m.unit
        FROM energy_measurements AS m
        JOIN energy_devices AS d
          ON d.id = m.device_id
        WHERE d.device_id = %s
          AND d.active = TRUE
          AND m.measurement_type = 'energy_total'
          AND m.measured_at >= %s
          AND m.measured_at <= %s
        ORDER BY m.measured_at, m.id
        """,
        (
            device_id,
            month_start_utc,
            end_utc + READING_TOLERANCE,
        ),
    )

    return parse_meter_readings(
        cursor.fetchall(),
        device_id=device_id,
    )


def fetch_spot_prices(
    cursor,
    *,
    price_area,
    start_utc,
    end_utc,
):
    cursor.execute(
        """
        SELECT
            price_area,
            period_start,
            period_end,
            price_nok_kwh,
            includes_vat
        FROM energy_spot_prices
        WHERE price_area = %s
          AND period_start >= %s
          AND period_start < %s
        ORDER BY period_start, id
        """,
        (price_area, start_utc, end_utc),
    )

    return parse_spot_prices(
        cursor.fetchall(),
        price_area=price_area,
    )


def fetch_agreement(
    cursor,
    *,
    device_id,
    price_area,
    first_local_date=None,
    last_local_date=None,
):
    cursor.execute(
        """
        SELECT
            a.id,
            a.agreement_type,
            a.valid_from,
            a.valid_to,
            a.price_nok_kwh_ex_vat,
            a.monthly_limit_kwh,
            a.price_area
        FROM energy_price_agreements AS a
        JOIN energy_devices AS d
          ON d.id = a.device_id
        WHERE d.device_id = %s
          AND a.agreement_type = 'norgespris'
        ORDER BY a.valid_from, a.id
        """,
        (device_id,),
    )

    rows = cursor.fetchall()

    if first_local_date is None and last_local_date is None:
        return parse_agreement(
            rows,
            price_area=price_area,
        )

    if first_local_date is None or last_local_date is None:
        raise ValueError("Both local dates are required")

    return select_agreement_for_period(
        rows,
        price_area=price_area,
        first_local_date=first_local_date,
        last_local_date=last_local_date,
    )


def load_norgespris_data(
    cursor,
    *,
    device_id,
    price_area,
    start_utc,
    end_utc,
):
    start, end, month_start = validate_period(
        start_utc,
        end_utc,
    )

    agreement = fetch_agreement(
        cursor,
        device_id=device_id,
        price_area=price_area,
        first_local_date=start.astimezone(OSLO).date(),
        last_local_date=(
            end - ONE_HOUR
        ).astimezone(OSLO).date(),
    )

    readings = fetch_meter_readings(
        cursor,
        device_id=device_id,
        month_start_utc=month_start,
        end_utc=end,
    )

    prices = fetch_spot_prices(
        cursor,
        price_area=price_area,
        start_utc=start,
        end_utc=end,
    )

    return {
        "device_id": device_id,
        "price_area": price_area,
        "first_hour_utc": start,
        "end_utc": end,
        "month_start_utc": month_start,
        "agreement": agreement,
        "readings": readings,
        "spot_prices": prices,
    }
