import unittest
from datetime import datetime, timezone
from decimal import Decimal

from norgespris_coverage import MeterReading
from norgespris_baseline import verify_month_baseline


D = Decimal
UTC = timezone.utc


def reading(timestamp, value):
    return MeterReading(
        device_id="aidon_main",
        measured_at=datetime.fromisoformat(timestamp),
        cumulative_kwh=D(value),
    )


class NorgesprisBaselineTests(unittest.TestCase):

    def verify(self, readings, first_hour):
        return verify_month_baseline(
            readings,
            device_id="aidon_main",
            first_hour_utc=datetime.fromisoformat(first_hour),
        )

    def test_verified_previous_consumption(self):
        readings = [
            reading("2026-10-31T23:00:11+00:00", "100"),
            reading("2026-11-01T00:00:11+00:00", "103"),
            reading("2026-11-01T01:00:11+00:00", "107"),
        ]

        result = self.verify(
            readings,
            "2026-11-01T01:00:00+00:00",
        )

        self.assertEqual(result, D("7"))

    def test_missing_month_start_blocks_baseline(self):
        readings = [
            reading("2026-11-01T00:00:11+00:00", "103"),
            reading("2026-11-01T01:00:11+00:00", "107"),
        ]

        result = self.verify(
            readings,
            "2026-11-01T01:00:00+00:00",
        )

        self.assertIsNone(result)

    def test_multi_hour_total_is_valid_baseline(self):
        readings = [
            reading("2026-10-31T23:00:11+00:00", "100"),
            reading("2026-11-01T01:00:11+00:00", "107"),
        ]

        result = self.verify(
            readings,
            "2026-11-01T01:00:00+00:00",
        )

        self.assertEqual(result, D("7"))

    def test_october_month_start_uses_local_time(self):
        # 1. oktober kl. 00:00 i Norge er
        # 30. september kl. 22:00 UTC.
        readings = [
            reading("2026-09-30T22:00:11+00:00", "100"),
            reading("2026-09-30T23:00:11+00:00", "104"),
        ]

        result = self.verify(
            readings,
            "2026-09-30T23:00:00+00:00",
        )

        self.assertEqual(result, D("4"))

    def test_first_hour_at_month_start_has_zero_previous(self):
        result = self.verify(
            [],
            "2026-10-31T23:00:00+00:00",
        )

        self.assertEqual(result, D("0"))


if __name__ == "__main__":
    unittest.main()
