import unittest
from datetime import date, datetime, timezone
from decimal import Decimal

from norgespris_monthly import HourInput, calculate_month


D = Decimal
UTC = timezone.utc


class NorgesprisEngineQualityTests(unittest.TestCase):

    def calculate(self, hours, previous):
        return calculate_month(
            hours,
            valid_from=date(2025, 10, 17),
            valid_to=date(2026, 12, 31),
            fixed_price_nok_kwh=D("0.40"),
            monthly_limit_kwh=D("5000"),
            verified_previous_kwh=previous,
        )

    def test_missing_consumption_is_not_zero(self):
        hours = [
            HourInput(
                datetime(2026, 11, 12, 0, tzinfo=UTC),
                None, D("1.00")
            ),
            HourInput(
                datetime(2026, 11, 12, 1, tzinfo=UTC),
                D("10"), D("1.00")
            ),
        ]

        result = self.calculate(hours, D("100"))

        self.assertEqual(
            result[0].status,
            "missing_consumption",
        )
        self.assertEqual(
            result[1].status,
            "incomplete_month_history",
        )
        self.assertIsNone(
            result[1].adjustment_nok_ex_vat
        )

    def test_missing_spot_preserves_monthly_consumption(self):
        hours = [
            HourInput(
                datetime(2026, 11, 12, 0, tzinfo=UTC),
                D("10"), None
            ),
            HourInput(
                datetime(2026, 11, 12, 1, tzinfo=UTC),
                D("10"), D("1.00")
            ),
        ]

        result = self.calculate(hours, D("4990"))

        self.assertEqual(
            result[0].status,
            "missing_spot_price",
        )
        self.assertEqual(
            result[1].eligible_kwh,
            D("0"),
        )
        self.assertEqual(
            result[1].adjustment_nok_ex_vat,
            D("0.00"),
        )

    def test_missing_hour_invalidates_later_calculation(self):
        hours = [
            HourInput(
                datetime(2026, 11, 12, 0, tzinfo=UTC),
                D("10"), D("1.00")
            ),
            HourInput(
                datetime(2026, 11, 12, 2, tzinfo=UTC),
                D("10"), D("1.00")
            ),
        ]

        result = self.calculate(hours, D("0"))

        self.assertEqual(
            result[1].status,
            "incomplete_month_history",
        )
        self.assertIsNone(
            result[1].eligible_kwh
        )

    def test_unverified_history_blocks_adjustment(self):
        hours = [
            HourInput(
                datetime(2026, 11, 12, 0, tzinfo=UTC),
                D("10"), D("1.00")
            )
        ]

        result = self.calculate(hours, None)

        self.assertEqual(
            result[0].status,
            "incomplete_month_history",
        )
        self.assertIsNone(
            result[0].adjustment_nok_ex_vat
        )


if __name__ == "__main__":
    unittest.main()
