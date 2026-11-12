from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class NorgesprisResult:
    eligible_kwh: Decimal | None
    adjustment_nok_ex_vat: Decimal | None
    remaining_limit_kwh: Decimal | None
    status: str


def calculate_norgespris(
    consumption_kwh: Decimal,
    spot_price_nok_kwh: Decimal,
    fixed_price_nok_kwh: Decimal,
    monthly_limit_kwh: Decimal,
    previous_month_consumption_kwh: Decimal | None,
) -> NorgesprisResult:
    """
    Calculate Norgespris adjustment for one hour.

    Positive adjustment means compensation.
    Negative adjustment means an additional charge.

    Previous monthly consumption must be verified.
    """

    values = (
        consumption_kwh,
        fixed_price_nok_kwh,
        monthly_limit_kwh,
    )

    if any(value < 0 for value in values):
        raise ValueError("Negative input is not permitted")

    if previous_month_consumption_kwh is None:
        return NorgesprisResult(
            eligible_kwh=None,
            adjustment_nok_ex_vat=None,
            remaining_limit_kwh=None,
            status="incomplete_month_history",
        )

    if previous_month_consumption_kwh < 0:
        raise ValueError("Negative previous consumption")

    remaining = max(
        Decimal("0"),
        monthly_limit_kwh - previous_month_consumption_kwh,
    )

    eligible = min(consumption_kwh, remaining)

    adjustment = eligible * (
        spot_price_nok_kwh - fixed_price_nok_kwh
    )

    return NorgesprisResult(
        eligible_kwh=eligible,
        adjustment_nok_ex_vat=adjustment,
        remaining_limit_kwh=remaining - eligible,
        status="valid",
    )
