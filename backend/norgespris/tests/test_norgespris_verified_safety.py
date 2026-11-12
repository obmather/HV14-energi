import unittest
from datetime import date, datetime
from decimal import Decimal

from norgespris_coverage import MeterReading
from norgespris_verified import calculate_verified_month


D = Decimal


def ts(value):
    return datetime.fromisoformat(value)


def reading(hour, value):
    return MeterReading(
        device_id="aidon_main",
        measured_at=ts(
            f"2026-11-01T{hour:02d}:00:11+00:00"
        ),
        cumulative_kwh=D(value),
    )


H0 = ts("2026-10-31T23:00:00+00:00")
H1 = ts("2026-11-01T00:00:00+00:00")
H2 = ts("2026-11-01T01:00:00+00:00")
H3 = ts("2026-11-01T02:00:00+00:00")
H4 = ts("2026-11-01T03:00:00+00:00")


class VerifiedSafetyTests(unittest.TestCase):

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

    def test_counter_decrease_blocks_later_adjustment(self):
        readings = [
            reading(0, "100"),
            reading(1, "103"),
            reading(2, "102"),
            reading(3, "106"),
            reading(4, "109"),
        ]

        result = self.calculate(
            readings, H1, H4,
            {
                H1: D("1.00"),
                H2: D("1.00"),
                H3: D("1.00"),
            },
        )

        self.assertEqual(len(result), 3)

        self.assertTrue(all(
            item.adjustment_nok_ex_vat is None
            for item in result
        ))

    def test_monthly_limit_uses_verified_baseline(self):
        readings = [
            MeterReading(
                device_id="aidon_main",
                measured_at=ts(
                    "2026-10-31T23:00:11+00:00"
                ),
                cumulative_kwh=D("100"),
            ),
            reading(0, "5095"),
            reading(1, "5105"),
        ]

        result = self.calculate(
            readings, H1, H2,
            {H1: D("1.00")},
        )

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].status, "valid")
        self.assertEqual(result[0].eligible_kwh, D("5"))
        self.assertEqual(
            result[0].adjustment_nok_ex_vat,
            D("3.00"),
        )

    def test_cross_month_period_rejected(self):
        with self.assertRaises(ValueError):
            self.calculate(
                [],
                ts("2026-11-30T22:00:00+00:00"),
                ts("2026-12-01T01:00:00+00:00"),
                {},
            )


if __name__ == "__main__":
    unittest.main()
