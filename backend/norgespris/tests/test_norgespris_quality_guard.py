import unittest
from datetime import datetime
from decimal import Decimal

from norgespris_db import fetch_meter_readings
from norgespris_repository import parse_meter_readings


def ts(value):
    return datetime.fromisoformat(value)


def row(quality):
    return {
        "device_id": "aidon_main",
        "measured_at": ts(
            "2026-11-12T04:00:11+00:00"
        ),
        "cumulative_kwh": Decimal("136598.00"),
        "quality": quality,
        "unit": "kWh",
    }


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows
        self.query = None
        self.params = None

    def execute(self, query, params):
        self.query = query
        self.params = params

    def fetchall(self):
        return self.rows


class QualityGuardTests(unittest.TestCase):

    def test_invalid_quality_rejected(self):
        with self.assertRaises(ValueError):
            parse_meter_readings(
                [row("invalid")],
                device_id="aidon_main",
            )

    def test_missing_quality_rejected(self):
        with self.assertRaises(ValueError):
            parse_meter_readings(
                [row(None)],
                device_id="aidon_main",
            )

    def test_wrong_unit_rejected(self):
        reading = row("valid")
        reading["unit"] = "Wh"

        with self.assertRaises(ValueError):
            parse_meter_readings(
                [reading],
                device_id="aidon_main",
            )

    def test_sql_does_not_hide_invalid_quality(self):
        cursor = FakeCursor([])

        fetch_meter_readings(
            cursor,
            device_id="aidon_main",
            month_start_utc=ts(
                "2026-10-31T23:00:00+00:00"
            ),
            end_utc=ts(
                "2026-11-12T06:00:00+00:00"
            ),
        )

        normalized = " ".join(
            cursor.query.lower().split()
        )

        self.assertNotIn(
            "m.quality = 'valid'",
            normalized,
        )

        self.assertIn(
            "m.quality",
            normalized,
        )

        self.assertIn(
            "m.unit",
            normalized,
        )


if __name__ == "__main__":
    unittest.main()
