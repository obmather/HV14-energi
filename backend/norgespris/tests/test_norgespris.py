import unittest
from decimal import Decimal

from norgespris import calculate_norgespris


D = Decimal


class NorgesprisTests(unittest.TestCase):

    def calculate(self, consumption, spot, previous):
        return calculate_norgespris(
            consumption_kwh=D(consumption),
            spot_price_nok_kwh=D(spot),
            fixed_price_nok_kwh=D("0.40"),
            monthly_limit_kwh=D("5000"),
            previous_month_consumption_kwh=(
                None if previous is None else D(previous)
            ),
        )

    def test_compensation(self):
        result = self.calculate("10", "1.00", "1000")
        self.assertEqual(
            result.adjustment_nok_ex_vat, D("6.00")
        )

    def test_additional_charge(self):
        result = self.calculate("10", "0.20", "1000")
        self.assertEqual(
            result.adjustment_nok_ex_vat, D("-2.00")
        )

    def test_monthly_limit(self):
        result = self.calculate("10", "1.00", "4995")
        self.assertEqual(result.eligible_kwh, D("5"))
        self.assertEqual(
            result.adjustment_nok_ex_vat, D("3.00")
        )
        self.assertEqual(
            result.remaining_limit_kwh, D("0")
        )

    def test_limit_exhausted(self):
        result = self.calculate("10", "1.00", "5000")
        self.assertEqual(result.eligible_kwh, D("0"))
        self.assertEqual(
            result.adjustment_nok_ex_vat, D("0.00")
        )

    def test_missing_month_history(self):
        result = self.calculate("10", "1.00", None)
        self.assertEqual(
            result.status, "incomplete_month_history"
        )
        self.assertIsNone(result.adjustment_nok_ex_vat)

    def test_negative_consumption_rejected(self):
        with self.assertRaises(ValueError):
            self.calculate("-1", "1.00", "1000")


if __name__ == "__main__":
    unittest.main()
