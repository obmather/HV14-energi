from dataclasses import dataclass
from decimal import Decimal

from norgespris_intervals import IntervalResult


@dataclass(frozen=True)
class ConsumptionSummary:
    status: str
    total_kwh: Decimal | None
    hourly_kwh: Decimal | None
    unallocated_kwh: Decimal | None
    unallocated_hours: int


def summarize_intervals(
    intervals: list[IntervalResult],
) -> ConsumptionSummary:
    """
    Summarize already classified meter intervals.

    This function does not verify meter identity,
    chronological continuity or monthly coverage.
    """

    if not intervals:
        return ConsumptionSummary(
            status="incomplete",
            total_kwh=None,
            hourly_kwh=None,
            unallocated_kwh=None,
            unallocated_hours=0,
        )

    total = Decimal("0")
    hourly = Decimal("0")
    unallocated = Decimal("0")
    unallocated_hours = 0

    for item in intervals:
        if (
            item.status not in ("hourly", "multi_hour")
            or item.total_kwh is None
            or item.hours is None
            or item.total_kwh < 0
            or item.hours < 1
        ):
            return ConsumptionSummary(
                status="incomplete",
                total_kwh=None,
                hourly_kwh=None,
                unallocated_kwh=None,
                unallocated_hours=0,
            )

        if item.status == "hourly":
            if item.hours != 1:
                return ConsumptionSummary(
                    "incomplete", None, None, None, 0
                )

            hourly += item.total_kwh

        elif item.status == "multi_hour":
            if item.hours <= 1:
                return ConsumptionSummary(
                    "incomplete", None, None, None, 0
                )

            unallocated += item.total_kwh
            unallocated_hours += item.hours

        total += item.total_kwh

    return ConsumptionSummary(
        status="complete",
        total_kwh=total,
        hourly_kwh=hourly,
        unallocated_kwh=unallocated,
        unallocated_hours=unallocated_hours,
    )
