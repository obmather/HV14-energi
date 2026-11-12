import unittest
from datetime import date, datetime, timezone
from decimal import Decimal

from norgespris_monthly import HourInput, calculate_month


D = Decimal
UTC = timezone.utc


class NorgesprisMonthlyEngineTests(unittest.TestCase):

    def run_month(self, hours, previous):
        return calculate_month(
            hours,
            valid_from=date(2025, 10, 17),
            valid_to=date(2026, 12, 31),
            fixed_price_nok_kwh=D("0.40"),
            monthly_limit_kwh=D("5000"),
            verified_previous_kwh=previous,
        )

    def test_verified_month(self):
        hours = [
            HourInput(
                datetime(2026, 11, 1, 0, tzinfo=UTC),
                D("10"), D("1.00")
            )
        ]
        result = self.run_month(hours, D("100"))
        self.assertEqual(
            result[0].adjustment_nok_ex_vat,
            D("6.00"),
        )

    def test_unknown_previous_consumption(self):
        hours = [
            HourInput(
                datetime(2026, 11, 12, 0, tzinfo=UTC),
                D("10"), D("1.00")
            )
        ]
        result = self.run_month(hours, None)
        self.assertEqual(
            result[0].status,
            "incomplete_month_history",
        )

    def test_missing_hour(self):
        hours = [
            HourInput(
                datetime(2026, 11, 1, 0, tzinfo=UTC),
                D("10"), D("1.00")
            ),
            HourInput(
                datetime(2026, 11, 1, 2, tzinfo=UTC),
                D("10"), D("1.00")
            ),
        ]
        result = self.run_month(hours, D("0"))
        self.assertEqual(result[0].status, "valid")
        self.assertEqual(
            result[1].status,
            "incomplete_month_history",
        )

    def test_limit_crossing(self):
        hours = [
            HourInput(
                datetime(2026, 11, 1, 0, tzinfo=UTC),
                D("10"), D("1.00")
            )
        ]
        result = self.run_month(hours, D("4995"))
        self.assertEqual(result[0].eligible_kwh, D("5"))
        self.assertEqual(
            result[0].adjustment_nok_ex_vat,
            D("3.00"),
        )

    def test_outside_agreement(self):
        hours = [
            HourInput(
                datetime(2027, 1, 1, 0, tzinfo=UTC),
                D("10"), D("1.00")
            )
        ]
        result = self.run_month(hours, None)
        self.assertEqual(
            result[0].status,
            "outside_agreement",
        )


if __name__ == "__main__":
    unittest.main()
