import unittest
from datetime import datetime, timezone
from decimal import Decimal

from norgespris_intervals import classify_interval


D = Decimal
UTC = timezone.utc


class NorgesprisIntervalAlignmentTests(unittest.TestCase):

    def test_readings_near_hour_boundary_accepted(self):
        result = classify_interval(
            datetime(2026, 11, 12, 7, 0, 11, tzinfo=UTC),
            D("1000"),
            datetime(2026, 11, 12, 8, 0, 13, tzinfo=UTC),
            D("1002.15"),
        )

        self.assertEqual(result.status, "hourly")
        self.assertEqual(result.total_kwh, D("2.15"))

    def test_half_hour_readings_rejected(self):
        result = classify_interval(
            datetime(2026, 11, 12, 7, 30, tzinfo=UTC),
            D("1000"),
            datetime(2026, 11, 12, 8, 30, tzinfo=UTC),
            D("1002"),
        )

        self.assertEqual(result.status, "invalid_alignment")
        self.assertIsNone(result.total_kwh)

    def test_multi_hour_misalignment_rejected(self):
        result = classify_interval(
            datetime(2026, 11, 12, 3, 15, tzinfo=UTC),
            D("1000"),
            datetime(2026, 11, 12, 5, 15, tzinfo=UTC),
            D("1005"),
        )

        self.assertEqual(result.status, "invalid_alignment")
        self.assertIsNone(result.total_kwh)


if __name__ == "__main__":
    unittest.main()
