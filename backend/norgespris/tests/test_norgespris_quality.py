import unittest
from datetime import datetime, timezone
from decimal import Decimal

from test_norgespris_monthly import calculate_month


D = Decimal
UTC = timezone.utc


class NorgesprisQualityTests(unittest.TestCase):

    def test_missing_timestamp_invalidates_remainder(self):
        hours = [
            (
                datetime(2026, 11, 1, 0, tzinfo=UTC),
                D("10"),
                D("1.00"),
            ),
            (
                datetime(2026, 11, 1, 2, tzinfo=UTC),
                D("10"),
                D("1.00"),
            ),
        ]

        result = calculate_month(hours)

        self.assertEqual(result, [D("6.00"), None])

    def test_missing_spot_price_preserves_consumption(self):
        hours = [
            (
                datetime(2026, 11, 1, 0, tzinfo=UTC),
                D("10"),
                None,
            ),
            (
                datetime(2026, 11, 1, 1, tzinfo=UTC),
                D("10"),
                D("1.00"),
            ),
        ]

        result = calculate_month(
            hours,
            initial_consumption=D("4990"),
        )

        self.assertEqual(result, [None, D("0.00")])

    def test_missing_consumption_does_not_become_zero(self):
        hours = [
            (
                datetime(2026, 11, 1, 0, tzinfo=UTC),
                None,
                D("1.00"),
            ),
            (
                datetime(2026, 11, 1, 1, tzinfo=UTC),
                D("10"),
                D("1.00"),
            ),
        ]

        self.assertEqual(
            calculate_month(hours),
            [None, None],
        )


if __name__ == "__main__":
    unittest.main()
