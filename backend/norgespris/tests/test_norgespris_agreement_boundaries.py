import unittest
from datetime import date, datetime, timezone
from decimal import Decimal

from norgespris_monthly import HourInput, calculate_month

D = Decimal
UTC = timezone.utc


def hour(day, hour_utc, consumption="10", spot="1.00"):
    return HourInput(
        datetime(2026, 11, day, hour_utc, tzinfo=UTC),
        D(consumption),
        D(spot),
    )


def calculate(hours, previous, valid_from):
    return calculate_month(
        hours,
        valid_from=valid_from,
        valid_to=date(2026, 12, 31),
        fixed_price_nok_kwh=D("0.40"),
        monthly_limit_kwh=D("5000"),
        verified_previous_kwh=previous,
    )


class AgreementBoundaryTests(unittest.TestCase):

    def test_before_agreement_has_no_adjustment(self):
        results = calculate(
            [hour(11, 22)],
            D("100"),
            date(2026, 11, 12),
        )
        self.assertEqual(
            results[0].status, "outside_agreement"
        )
        self.assertIsNone(
            results[0].adjustment_nok_ex_vat
        )

    def test_first_local_agreement_hour(self):
        # 2026-11-11 23:00 UTC = 12. november 00:00 Oslo.
        results = calculate(
            [hour(11, 23)],
            D("100"),
            date(2026, 11, 12),
        )
        self.assertEqual(results[0].status, "valid")
        self.assertEqual(results[0].eligible_kwh, D("10"))
        self.assertEqual(
            results[0].adjustment_nok_ex_vat,
            D("6.00"),
        )

    def test_consumption_before_start_counts_toward_cap(self):
        results = calculate(
            [hour(11, 23)],
            D("4995"),
            date(2026, 11, 12),
        )
        self.assertEqual(results[0].eligible_kwh, D("5"))
        self.assertEqual(
            results[0].adjustment_nok_ex_vat,
            D("3.00"),
        )

    def test_cap_exhausted_before_agreement_start(self):
        results = calculate(
            [hour(11, 23)],
            D("5000"),
            date(2026, 11, 12),
        )
        self.assertEqual(results[0].eligible_kwh, D("0"))
        self.assertEqual(
            results[0].adjustment_nok_ex_vat,
            D("0.00"),
        )

    def test_missing_prior_consumption_blocks_adjustment(self):
        results = calculate(
            [hour(11, 23)],
            None,
            date(2026, 11, 12),
        )
        self.assertEqual(
            results[0].status,
            "incomplete_month_history",
        )
        self.assertIsNone(
            results[0].adjustment_nok_ex_vat
        )


if __name__ == "__main__":
    unittest.main()
