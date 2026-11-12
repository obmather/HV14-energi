from datetime import datetime, timedelta, timezone
from decimal import Decimal
from math import isfinite

from norgespris_coverage import MeterReading


UTC = timezone.utc
ONE_HOUR = timedelta(hours=1)


def require_utc_hour(value):
    if not isinstance(value, datetime) or value.tzinfo is None:
        raise ValueError("Timezone-aware datetime required")

    value = value.astimezone(UTC)

    if value != value.replace(
        minute=0, second=0, microsecond=0
    ):
        raise ValueError("Timestamp must be a whole UTC hour")

    return value


def require_decimal(value, field):
    if value is None or isinstance(value, (bool, float)):
        raise ValueError(f"Invalid {field}")

    try:
        result = Decimal(value)
    except (TypeError, ValueError, ArithmeticError):
        raise ValueError(f"Invalid {field}") from None

    if not result.is_finite():
        raise ValueError(f"Non-finite {field}")

    return result


def parse_meter_readings(rows, *, device_id):
    result = []
    seen = set()
    seen_hours = set()

    for row in rows:
        if row["device_id"] != device_id:
            raise ValueError("Unexpected device identity")

        if row.get("quality") != "valid":
            raise ValueError("Invalid meter reading quality")

        if row.get("unit") != "kWh":
            raise ValueError("Invalid meter reading unit")

        measured_at = row["measured_at"]

        if not isinstance(measured_at, datetime):
            raise ValueError("Invalid meter timestamp")

        if measured_at.tzinfo is None:
            raise ValueError("Naive meter timestamp")

        measured_at = measured_at.astimezone(UTC)

        if measured_at in seen:
            raise ValueError("Duplicate meter timestamp")

        seen.add(measured_at)

        hour_start = measured_at.replace(
            minute=0,
            second=0,
            microsecond=0,
        )

        if hour_start in seen_hours:
            raise ValueError(
                "Multiple meter readings in the same UTC hour"
            )

        seen_hours.add(hour_start)

        value = require_decimal(
            row["cumulative_kwh"],
            "cumulative_kwh",
        )

        if value < 0:
            raise ValueError("Negative cumulative meter reading")

        result.append(
            MeterReading(
                device_id=device_id,
                measured_at=measured_at,
                cumulative_kwh=value,
            )
        )

    result.sort(key=lambda item: item.measured_at)
    return result


def parse_spot_prices(rows, *, price_area):
    result = {}

    for row in rows:
        if row["price_area"] != price_area:
            raise ValueError("Unexpected price area")

        if row["includes_vat"] is not False:
            raise ValueError("Spot price must exclude VAT")

        start = require_utc_hour(row["period_start"])
        end = require_utc_hour(row["period_end"])

        if end - start != ONE_HOUR:
            raise ValueError("Invalid spot price interval")

        if start in result:
            raise ValueError("Duplicate spot price hour")

        price = require_decimal(
            row["price_nok_kwh"],
            "price_nok_kwh",
        )

        # Negative spot prices are valid.
        result[start] = price

    return result



def select_agreement_for_period(
    rows,
    *,
    price_area,
    first_local_date,
    last_local_date,
):
    from datetime import date

    if (
        not isinstance(first_local_date, date)
        or not isinstance(last_local_date, date)
        or isinstance(first_local_date, datetime)
        or isinstance(last_local_date, datetime)
        or last_local_date < first_local_date
    ):
        raise ValueError("Invalid local agreement period")

    matching = []

    for row in rows:
        valid_from = row["valid_from"]
        valid_to = row["valid_to"]

        if (
            not isinstance(valid_from, date)
            or not isinstance(valid_to, date)
            or isinstance(valid_from, datetime)
            or isinstance(valid_to, datetime)
            or valid_to < valid_from
        ):
            raise ValueError("Invalid agreement dates")

        if (
            valid_from <= last_local_date
            and valid_to >= first_local_date
        ):
            matching.append(row)

    if len(matching) != 1:
        raise ValueError(
            "Exactly one agreement must overlap the period"
        )

    return parse_agreement(
        matching,
        price_area=price_area,
    )


def parse_agreement(rows, *, price_area):
    rows = list(rows)

    if len(rows) != 1:
        raise ValueError(
            "Exactly one Norgespris agreement required"
        )

    row = rows[0]

    if row["agreement_type"] != "norgespris":
        raise ValueError("Unexpected agreement type")

    if row["price_area"] != price_area:
        raise ValueError("Unexpected agreement price area")

    valid_from = row["valid_from"]
    valid_to = row["valid_to"]

    if (
        not isinstance(valid_from, __import__("datetime").date)
        or not isinstance(valid_to, __import__("datetime").date)
        or isinstance(valid_from, datetime)
        or isinstance(valid_to, datetime)
        or valid_to < valid_from
    ):
        raise ValueError("Invalid agreement dates")

    fixed_price = require_decimal(
        row["price_nok_kwh_ex_vat"],
        "price_nok_kwh_ex_vat",
    )

    monthly_limit = require_decimal(
        row["monthly_limit_kwh"],
        "monthly_limit_kwh",
    )

    if fixed_price < 0 or monthly_limit <= 0:
        raise ValueError("Invalid agreement values")

    return {
        "id": row["id"],
        "valid_from": valid_from,
        "valid_to": valid_to,
        "fixed_price_nok_kwh": fixed_price,
        "monthly_limit_kwh": monthly_limit,
        "price_area": price_area,
    }
