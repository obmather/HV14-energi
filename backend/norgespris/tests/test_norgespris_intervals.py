import unittest
from datetime import datetime, timezone
from decimal import Decimal

from norgespris_intervals import classify_interval


D = Decimal
UTC = timezone.utc


def at(hour):
    return datetime(2026, 11, 12, hour, tzinfo=UTC)


class NorgesprisIntervalTests(unittest.TestCase):

    def test_valid_hourly_interval(self):
        result = classify_interval(
            at(7), D("136612.96"),
            at(8), D("136615.11"),
        )

        self.assertEqual(result.status, "hourly")
        self.assertEqual(result.total_kwh, D("2.15"))
        self.assertEqual(result.hours, 1)

    def test_two_hour_gap_preserves_total(self):
        result = classify_interval(
            at(3), D("136595.97"),
            at(5), D("136600.91"),
        )

        self.assertEqual(result.status, "multi_hour")
        self.assertEqual(result.total_kwh, D("4.94"))
        self.assertEqual(result.hours, 2)

    def test_counter_decrease_rejected(self):
        result = classify_interval(
            at(7), D("1000"),
            at(8), D("990"),
        )

        self.assertEqual(result.status, "counter_decrease")
        self.assertIsNone(result.total_kwh)

    def test_invalid_interval_duration(self):
        result = classify_interval(
            at(7), D("1000"),
            datetime(
                2026, 11, 12, 8, 30, tzinfo=UTC
            ),
            D("1002"),
        )

        self.assertEqual(result.status, "invalid_duration")
        self.assertIsNone(result.total_kwh)

    def test_zero_consumption_is_valid(self):
        result = classify_interval(
            at(7), D("1000"),
            at(8), D("1000"),
        )

        self.assertEqual(result.status, "hourly")
        self.assertEqual(result.total_kwh, D("0"))


if __name__ == "__main__":
    unittest.main()
