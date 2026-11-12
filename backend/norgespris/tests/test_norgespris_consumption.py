import unittest
from datetime import datetime, timezone
from decimal import Decimal

from norgespris_consumption import summarize_intervals
from norgespris_intervals import classify_interval


D = Decimal
UTC = timezone.utc


def at(hour):
    return datetime(2026, 11, 12, hour, tzinfo=UTC)


def interval(start, end, first_kwh, last_kwh):
    return classify_interval(
        at(start), D(first_kwh),
        at(end), D(last_kwh),
    )


class NorgesprisConsumptionTests(unittest.TestCase):

    def test_consecutive_hours(self):
        intervals = [
            interval(1, 2, "100", "102"),
            interval(2, 3, "102", "105"),
        ]

        result = summarize_intervals(intervals)

        self.assertEqual(result.total_kwh, D("5"))
        self.assertEqual(result.hourly_kwh, D("5"))
        self.assertEqual(result.unallocated_kwh, D("0"))
        self.assertEqual(result.unallocated_hours, 0)

    def test_multi_hour_total_preserved(self):
        intervals = [
            interval(1, 2, "100", "102"),
            interval(2, 4, "102", "107"),
            interval(4, 5, "107", "110"),
        ]

        result = summarize_intervals(intervals)

        self.assertEqual(result.total_kwh, D("10"))
        self.assertEqual(result.hourly_kwh, D("5"))
        self.assertEqual(result.unallocated_kwh, D("5"))
        self.assertEqual(result.unallocated_hours, 2)

    def test_invalid_interval_blocks_verified_total(self):
        intervals = [
            interval(1, 2, "100", "102"),
            interval(2, 3, "102", "101"),
        ]

        result = summarize_intervals(intervals)

        self.assertIsNone(result.total_kwh)
        self.assertEqual(result.status, "incomplete")

    def test_zero_consumption_preserved(self):
        intervals = [
            interval(1, 2, "100", "100"),
            interval(2, 3, "100", "101"),
        ]

        result = summarize_intervals(intervals)

        self.assertEqual(result.total_kwh, D("1"))
        self.assertEqual(result.hourly_kwh, D("1"))
        self.assertEqual(result.status, "complete")


if __name__ == "__main__":
    unittest.main()
