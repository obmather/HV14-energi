import unittest
from datetime import datetime, timezone
from decimal import Decimal

from norgespris_repository import parse_meter_readings
from norgespris_db import fetch_meter_readings

UTC = timezone.utc


def timestamp(hour, minute=0, second=12):
    return datetime(
        2026, 11, 12,
        hour, minute, second,
        tzinfo=UTC,
    )


def reading(at, value, quality="valid"):
    return {
        "device_id": "aidon_main",
        "measured_at": at,
        "cumulative_kwh": Decimal(value),
        "quality": quality,
        "unit": "kWh",
    }


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows

    def execute(self, query, params):
        self.query = query
        self.params = params

    def fetchall(self):
        return self.rows


class HourBoundaryGuardTests(unittest.TestCase):

    def test_valid_reading_after_hour_boundary(self):
        result = parse_meter_readings(
            [
                reading(
                    timestamp(12),
                    "136623.64",
                ),
                reading(
                    timestamp(13),
                    "136625.49",
                ),
            ],
            device_id="aidon_main",
        )

        self.assertEqual(len(result), 2)

    def test_invalid_reading_at_period_end_rejected(self):
        cursor = FakeCursor([
            reading(
                timestamp(13),
                "136625.49",
                quality="invalid",
            ),
        ])

        with self.assertRaises(ValueError):
            fetch_meter_readings(
                cursor,
                device_id="aidon_main",
                month_start_utc=datetime(
                    2026, 11, 1, 0,
                    tzinfo=UTC,
                ),
                end_utc=datetime(
                    2026, 11, 12, 13,
                    tzinfo=UTC,
                ),
            )

    def test_two_readings_in_same_hour_rejected(self):
        rows = [
            reading(
                timestamp(12, 0, 12),
                "136623.64",
            ),
            reading(
                timestamp(12, 1, 15),
                "136623.70",
            ),
        ]

        with self.assertRaises(ValueError):
            parse_meter_readings(
                rows,
                device_id="aidon_main",
            )


if __name__ == "__main__":
    unittest.main()
