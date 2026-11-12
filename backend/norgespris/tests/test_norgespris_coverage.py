import unittest
from datetime import datetime, timezone
from decimal import Decimal

from norgespris_coverage import MeterReading, verify_coverage


D = Decimal
UTC = timezone.utc


def reading(hour, value, device="aidon_main"):
    return MeterReading(
        device_id=device,
        measured_at=datetime(
            2026, 11, 12, hour, tzinfo=UTC
        ),
        cumulative_kwh=D(value),
    )


class NorgesprisCoverageTests(unittest.TestCase):

    def verify(self, readings, start=1, end=5):
        return verify_coverage(
            readings,
            device_id="aidon_main",
            start_utc=datetime(
                2026, 11, 12, start, tzinfo=UTC
            ),
            end_utc=datetime(
                2026, 11, 12, end, tzinfo=UTC
            ),
        )

    def test_complete_hourly_coverage(self):
        readings = [
            reading(1, "100"),
            reading(2, "102"),
            reading(3, "105"),
            reading(4, "107"),
            reading(5, "110"),
        ]

        result = self.verify(readings)

        self.assertEqual(result.status, "complete")
        self.assertEqual(result.total_kwh, D("10"))
        self.assertEqual(result.unallocated_hours, 0)

    def test_multi_hour_gap_preserves_total(self):
        readings = [
            reading(1, "100"),
            reading(2, "102"),
            reading(4, "107"),
            reading(5, "110"),
        ]

        result = self.verify(readings)

        self.assertEqual(result.status, "complete")
        self.assertEqual(result.total_kwh, D("10"))
        self.assertEqual(result.unallocated_kwh, D("5"))
        self.assertEqual(result.unallocated_hours, 2)

    def test_missing_start_boundary_rejected(self):
        readings = [
            reading(2, "102"),
            reading(3, "105"),
            reading(4, "107"),
            reading(5, "110"),
        ]

        result = self.verify(readings)

        self.assertEqual(result.status, "incomplete")
        self.assertIsNone(result.total_kwh)

    def test_missing_end_boundary_rejected(self):
        readings = [
            reading(1, "100"),
            reading(2, "102"),
            reading(3, "105"),
            reading(4, "107"),
        ]

        result = self.verify(readings)

        self.assertEqual(result.status, "incomplete")
        self.assertIsNone(result.total_kwh)

    def test_different_device_rejected(self):
        readings = [
            reading(1, "100"),
            reading(2, "102"),
            reading(3, "105", "other_meter"),
            reading(4, "107"),
            reading(5, "110"),
        ]

        result = self.verify(readings)

        self.assertEqual(result.status, "incomplete")
        self.assertIsNone(result.total_kwh)

    def test_counter_decrease_rejected(self):
        readings = [
            reading(1, "100"),
            reading(2, "102"),
            reading(3, "99"),
            reading(4, "107"),
            reading(5, "110"),
        ]

        result = self.verify(readings)

        self.assertEqual(result.status, "incomplete")
        self.assertIsNone(result.total_kwh)

    def test_unordered_readings_rejected(self):
        readings = [
            reading(1, "100"),
            reading(3, "105"),
            reading(2, "102"),
            reading(4, "107"),
            reading(5, "110"),
        ]

        result = self.verify(readings)

        self.assertEqual(result.status, "incomplete")
        self.assertIsNone(result.total_kwh)


if __name__ == "__main__":
    unittest.main()
