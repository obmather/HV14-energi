import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal


def calculate_interval(first, last):
    """Return hourly consumption only for valid intervals."""
    if first is None or last is None:
        return None

    elapsed = (last[0] - first[0]).total_seconds()
    difference = last[1] - first[1]

    if difference < 0:
        return None

    if not 55 * 60 <= elapsed <= 65 * 60:
        return None

    return difference


class HourlyDataTests(unittest.TestCase):

    def setUp(self):
        self.t0 = datetime(
            2026, 11, 12, 3, tzinfo=timezone.utc
        )

    def test_valid_hour(self):
        first = (self.t0, Decimal("100"))
        last = (
            self.t0 + timedelta(hours=1),
            Decimal("102.5"),
        )
        self.assertEqual(
            calculate_interval(first, last),
            Decimal("2.5"),
        )

    def test_missing_hour_not_estimated(self):
        first = (self.t0, Decimal("100"))
        last = (
            self.t0 + timedelta(hours=2),
            Decimal("104.94"),
        )
        self.assertIsNone(
            calculate_interval(first, last)
        )

    def test_counter_reset_rejected(self):
        first = (self.t0, Decimal("100"))
        last = (
            self.t0 + timedelta(hours=1),
            Decimal("90"),
        )
        self.assertIsNone(
            calculate_interval(first, last)
        )


if __name__ == "__main__":
    unittest.main()
