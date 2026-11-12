import unittest
from datetime import datetime, date
from decimal import Decimal

from norgespris_coverage import MeterReading
from norgespris_verified import calculate_verified_month


D = Decimal


def ts(value):
    return datetime.fromisoformat(value)


def reading(time, value):
    return MeterReading(
        device_id="aidon_main",
        measured_at=ts(time),
        cumulative_kwh=D(value),
    )


START = ts("2026-10-31T23:00:00+00:00")
H1 = ts("2026-11-01T00:00:00+00:00")
H2 = ts("2026-11-01T01:00:00+00:00")
H3 = ts("2026-11-01T02:00:00+00:00")


class VerifiedIntegrationTests(unittest.TestCase):

    def calculate(self, readings, start, end, prices):
        return calculate_verified_month(
            readings=readings,
            device_id="aidon_main",
            first_hour_utc=start,
            end_utc=end,
            spot_prices=prices,
            valid_from=date(2025, 10, 17),
            valid_to=date(2026, 12, 31),
            fixed_price_nok_kwh=D("0.40"),
            monthly_limit_kwh=D("5000"),
        )

    def test_complete_month_start(self):
        readings = [
            reading("2026-10-31T23:00:11+00:00", "100"),
            reading("2026-11-01T00:00:11+00:00", "103"),
            reading("2026-11-01T01:00:11+00:00", "107"),
        ]

        result = self.calculate(
            readings, START, H2,
            {START: D("1.00"), H1: D("1.20")},
        )

        self.assertEqual(len(result), 2)
        self.assertEqual(
            [r.status for r in result],
            ["valid", "valid"],
        )
        self.assertEqual(
            [r.eligible_kwh for r in result],
            [D("3"), D("4")],
        )
        self.assertEqual(
            [r.adjustment_nok_ex_vat for r in result],
            [D("1.80"), D("3.20")],
        )

    def test_missing_month_history(self):
        readings = [
            reading("2026-11-01T00:00:11+00:00", "103"),
            reading("2026-11-01T01:00:11+00:00", "107"),
            reading("2026-11-01T02:00:11+00:00", "110"),
        ]

        result = self.calculate(
            readings, H2, H3,
            {H2: D("1.20")},
        )

        self.assertEqual(len(result), 1)
        self.assertEqual(
            result[0].status,
            "incomplete_month_history",
        )
        self.assertIsNone(result[0].adjustment_nok_ex_vat)

    def test_two_hour_gap_not_allocated(self):
        readings = [
            reading("2026-10-31T23:00:11+00:00", "100"),
            reading("2026-11-01T01:00:11+00:00", "107"),
        ]

        result = self.calculate(
            readings, START, H2,
            {START: D("1.00"), H1: D("1.20")},
        )

        self.assertEqual(len(result), 2)
        self.assertTrue(all(
            r.adjustment_nok_ex_vat is None
            for r in result
        ))

    def test_missing_end_reading(self):
        readings = [
            reading("2026-10-31T23:00:11+00:00", "100"),
            reading("2026-11-01T00:00:11+00:00", "103"),
        ]

        result = self.calculate(
            readings, START, H2,
            {START: D("1.00"), H1: D("1.20")},
        )

        self.assertEqual(len(result), 2)
        self.assertIsNone(result[1].adjustment_nok_ex_vat)

    def test_missing_spot_does_not_remove_hour(self):
        readings = [
            reading("2026-10-31T23:00:11+00:00", "100"),
            reading("2026-11-01T00:00:11+00:00", "103"),
            reading("2026-11-01T01:00:11+00:00", "107"),
        ]

        result = self.calculate(
            readings, START, H2,
            {H1: D("1.20")},
        )

        self.assertEqual(len(result), 2)
        self.assertEqual(
            [r.status for r in result],
            ["missing_spot_price", "valid"],
        )
        self.assertEqual(
            result[1].adjustment_nok_ex_vat,
            D("3.20"),
        )


if __name__ == "__main__":
    unittest.main()
