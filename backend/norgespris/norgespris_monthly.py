from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from norgespris import calculate_norgespris
from norgespris_calendar import agreement_applies, local_month


@dataclass(frozen=True)
class HourInput:
    hour_start: datetime
    consumption_kwh: Decimal | None
    spot_price_nok_kwh: Decimal | None


@dataclass(frozen=True)
class HourResult:
    hour_start: datetime
    eligible_kwh: Decimal | None
    adjustment_nok_ex_vat: Decimal | None
    status: str


def calculate_month(
    hours: list[HourInput],
    *,
    valid_from: date,
    valid_to: date,
    fixed_price_nok_kwh: Decimal,
    monthly_limit_kwh: Decimal,
    verified_previous_kwh: Decimal | None,
) -> list[HourResult]:

    if monthly_limit_kwh <= 0:
        raise ValueError("Monthly limit must be positive")

    if fixed_price_nok_kwh < 0:
        raise ValueError("Fixed price cannot be negative")

    if valid_to < valid_from:
        raise ValueError("Invalid agreement dates")

    if verified_previous_kwh is not None:
        if verified_previous_kwh < 0:
            raise ValueError("Negative previous consumption")

    previous = verified_previous_kwh
    previous_hour = None
    current_month = None
    results = []

    for item in hours:
        timestamp = item.hour_start

        if timestamp.tzinfo is None:
            raise ValueError("Timezone-aware timestamp required")

        timestamp = timestamp.astimezone(timezone.utc)
        month = local_month(timestamp)

        if current_month is None:
            current_month = month
        elif month != current_month:
            raise ValueError(
                "One calculation must cover one local month"
            )

        if previous_hour is not None:
            elapsed = timestamp - previous_hour

            if elapsed <= timedelta(0):
                raise ValueError(
                    "Hours must be strictly chronological"
                )

            if elapsed != timedelta(hours=1):
                previous = None

        previous_hour = timestamp

        if not agreement_applies(
            timestamp, valid_from, valid_to
        ):
            results.append(HourResult(
                timestamp, None, None, "outside_agreement"
            ))
            continue

        consumption = item.consumption_kwh

        if consumption is None:
            previous = None
            results.append(HourResult(
                timestamp, None, None, "missing_consumption"
            ))
            continue

        if consumption < 0:
            raise ValueError("Negative hourly consumption")

        if previous is None:
            if item.spot_price_nok_kwh is None:
                results.append(HourResult(
                    timestamp, None, None,
                    "missing_spot_price"
                ))
                continue

            # Provisional hourly estimate only.
            # The monthly cap cannot be verified without
            # complete preceding monthly consumption.
            provisional_adjustment = (
                consumption
                * (
                    item.spot_price_nok_kwh
                    - fixed_price_nok_kwh
                )
            )

            results.append(HourResult(
                timestamp,
                consumption,
                provisional_adjustment,
                "incomplete_month_history"
            ))
            continue

        if item.spot_price_nok_kwh is None:
            previous += consumption
            results.append(HourResult(
                timestamp, None, None, "missing_spot_price"
            ))
            continue

        calculation = calculate_norgespris(
            consumption_kwh=consumption,
            spot_price_nok_kwh=item.spot_price_nok_kwh,
            fixed_price_nok_kwh=fixed_price_nok_kwh,
            monthly_limit_kwh=monthly_limit_kwh,
            previous_month_consumption_kwh=previous,
        )

        previous += consumption

        results.append(HourResult(
            timestamp,
            calculation.eligible_kwh,
            calculation.adjustment_nok_ex_vat,
            calculation.status,
        ))

    return results
