import unittest
from datetime import date, datetime, timezone

from norgespris_calendar import (
    agreement_applies,
    local_month,
    utc_hours_in_local_day,
)


UTC = timezone.utc


class NorgesprisCalendarTests(unittest.TestCase):

    def test_normal_day_has_24_hours(self):
        self.assertEqual(
            len(utc_hours_in_local_day(date(2026, 11, 12))),
            24,
        )

    def test_spring_day_has_23_hours(self):
        self.assertEqual(
            len(utc_hours_in_local_day(date(2026, 3, 29))),
            23,
        )

    def test_autumn_day_has_25_hours(self):
        self.assertEqual(
            len(utc_hours_in_local_day(date(2026, 10, 25))),
            25,
        )

    def test_local_month_differs_from_utc(self):
        hour = datetime(
            2026, 10, 31, 23, 0, tzinfo=UTC
        )
        self.assertEqual(local_month(hour), (2026, 11))

    def test_agreement_first_day(self):
        hour = datetime(
            2025, 10, 16, 22, 0, tzinfo=UTC
        )
        self.assertTrue(
            agreement_applies(
                hour,
                date(2025, 10, 17),
                date(2026, 12, 31),
            )
        )

    def test_before_agreement(self):
        hour = datetime(
            2025, 10, 16, 21, 0, tzinfo=UTC
        )
        self.assertFalse(
            agreement_applies(
                hour,
                date(2025, 10, 17),
                date(2026, 12, 31),
            )
        )

    def test_after_agreement(self):
        hour = datetime(
            2026, 12, 31, 23, 0, tzinfo=UTC
        )
        self.assertFalse(
            agreement_applies(
                hour,
                date(2025, 10, 17),
                date(2026, 12, 31),
            )
        )

    def test_repeated_autumn_hour_distinct(self):
        hours = utc_hours_in_local_day(
            date(2026, 10, 25)
        )
        self.assertEqual(len(hours), len(set(hours)))


if __name__ == "__main__":
    unittest.main()
