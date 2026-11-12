import unittest
from datetime import datetime, date, timezone
from decimal import Decimal

from norgespris_monthly import HourInput, calculate_month


class NorgesprisIntegrationSafetyTests(unittest.TestCase):

    def test_missing_month_baseline_blocks_calculation(self):
        hours = [
            HourInput(
                hour_start=datetime(
                    2026, 11, 12, 10,
                    tzinfo=timezone.utc
                ),
                consumption_kwh=Decimal("2.5"),
                spot_price_nok_kwh=Decimal("1.2"),
            )
        ]

        result = calculate_month(
            hours,
            valid_from=date(2025, 10, 17),
            valid_to=date(2026, 12, 31),
            fixed_price_nok_kwh=Decimal("0.40"),
            monthly_limit_kwh=Decimal("5000"),
            verified_previous_kwh=None,
        )

        self.assertEqual(
            result[0].status,
            "incomplete_month_history"
        )
        self.assertIsNone(
            result[0].adjustment_nok_ex_vat
        )

    def test_missing_hour_invalidates_later_calculation(self):
        hours = [
            HourInput(
                datetime(2026, 11, 12, 2, tzinfo=timezone.utc),
                Decimal("2.56"),
                Decimal("1.0"),
            ),
            HourInput(
                datetime(2026, 11, 12, 3, tzinfo=timezone.utc),
                None,
                Decimal("1.0"),
            ),
            HourInput(
                datetime(2026, 11, 12, 4, tzinfo=timezone.utc),
                None,
                Decimal("1.0"),
            ),
            HourInput(
                datetime(2026, 11, 12, 5, tzinfo=timezone.utc),
                Decimal("7.23"),
                Decimal("1.0"),
            ),
        ]

        result = calculate_month(
            hours,
            valid_from=date(2025, 10, 17),
            valid_to=date(2026, 12, 31),
            fixed_price_nok_kwh=Decimal("0.40"),
            monthly_limit_kwh=Decimal("5000"),
            verified_previous_kwh=Decimal("100"),
        )

        self.assertEqual(
            [item.status for item in result],
            [
                "valid",
                "missing_consumption",
                "missing_consumption",
                "incomplete_month_history",
            ]
        )

        self.assertIsNone(
            result[-1].adjustment_nok_ex_vat
        )


if __name__ == "__main__":
    unittest.main()
