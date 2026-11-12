import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from norgespris import calculate_norgespris
from norgespris_calendar import local_month


D = Decimal
UTC = timezone.utc


def calculate_month(hours, initial_consumption=D("0")):
    """
    Test-only monthly calculation.

    Hours must be chronological and complete.
    Missing consumption invalidates exact calculation
    for the remaining month.
    """

    previous = initial_consumption
    current_month = None
    previous_timestamp = None
    results = []

    for timestamp, consumption, spot in hours:
        if timestamp.tzinfo is None:
            raise ValueError("Timezone-aware timestamp required")

        month = local_month(timestamp)

        if month != current_month:
            current_month = month
            previous = initial_consumption

        if previous_timestamp is not None:
            elapsed = (
                timestamp.astimezone(UTC)
                - previous_timestamp.astimezone(UTC)
            )

            if elapsed != timedelta(hours=1):
                if elapsed <= timedelta(0):
                    raise ValueError(
                        "Hours must be strictly chronological"
                    )

                previous = None

        previous_timestamp = timestamp

        if consumption is None:
            previous = None
            results.append(None)
            continue

        if previous is None or spot is None:
            results.append(None)

            if previous is not None:
                previous += consumption

            continue

        result = calculate_norgespris(
            consumption_kwh=consumption,
            spot_price_nok_kwh=spot,
            fixed_price_nok_kwh=D("0.40"),
            monthly_limit_kwh=D("5000"),
            previous_month_consumption_kwh=previous,
        )

        results.append(result.adjustment_nok_ex_vat)
        previous += consumption

    return results


class NorgesprisMonthlyTests(unittest.TestCase):

    def test_two_consecutive_hours(self):
        hours = [
            (datetime(2026, 11, 1, 0, tzinfo=UTC),
             D("10"), D("1.00")),
            (datetime(2026, 11, 1, 1, tzinfo=UTC),
             D("20"), D("0.80")),
        ]

        self.assertEqual(
            calculate_month(hours),
            [D("6.00"), D("8.00")],
        )

    def test_limit_crossed(self):
        hours = [
            (datetime(2026, 11, 1, 0, tzinfo=UTC),
             D("10"), D("1.00")),
            (datetime(2026, 11, 1, 1, tzinfo=UTC),
             D("10"), D("1.00")),
        ]

        self.assertEqual(
            calculate_month(hours, D("4995")),
            [D("3.00"), D("0.00")],
        )

    def test_missing_hour_invalidates_remainder(self):
        hours = [
            (datetime(2026, 11, 1, 0, tzinfo=UTC),
             D("10"), D("1.00")),
            (datetime(2026, 11, 1, 1, tzinfo=UTC),
             None, D("1.00")),
            (datetime(2026, 11, 1, 2, tzinfo=UTC),
             D("10"), D("1.00")),
        ]

        self.assertEqual(
            calculate_month(hours),
            [D("6.00"), None, None],
        )

    def test_unknown_initial_consumption(self):
        hours = [
            (datetime(2026, 11, 12, 0, tzinfo=UTC),
             D("10"), D("1.00")),
        ]

        self.assertEqual(
            calculate_month(hours, None),
            [None],
        )

    def test_month_resets(self):
        hours = [
            (datetime(2026, 11, 30, 22, tzinfo=UTC),
             D("10"), D("1.00")),
            (datetime(2026, 11, 30, 23, tzinfo=UTC),
             D("10"), D("1.00")),
        ]

        self.assertEqual(
            calculate_month(hours, D("4995")),
            [D("3.00"), D("3.00")],
        )


if __name__ == "__main__":
    unittest.main()
