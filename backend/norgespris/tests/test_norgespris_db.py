import unittest
from datetime import datetime, date
from decimal import Decimal
from norgespris_db import validate_period, fetch_meter_readings, fetch_spot_prices, fetch_agreement, load_norgespris_data
D = Decimal

def ts(value):
    return datetime.fromisoformat(value)

class FakeCursor:

    def __init__(self, responses):
        self.responses = iter(responses)
        self.calls = []
        self.rows = []

    def execute(self, query, params=None):
        self.calls.append((query, params))
        self.rows = next(self.responses)

    def fetchall(self):
        return self.rows

def agreement():
    return {'id': 1, 'agreement_type': 'norgespris', 'valid_from': date(2025, 10, 17), 'valid_to': date(2026, 12, 31), 'price_nok_kwh_ex_vat': D('0.40'), 'monthly_limit_kwh': D('5000'), 'price_area': 'NO2'}

class NorgesprisDatabaseTests(unittest.TestCase):

    def test_november_month_start(self):
        start, end, month_start = validate_period(ts('2026-11-12T10:00:00+00:00'), ts('2026-11-12T11:00:00+00:00'))
        self.assertEqual(month_start, ts('2026-10-31T23:00:00+00:00'))

    def test_summer_month_start(self):
        _, _, month_start = validate_period(ts('2026-07-12T10:00:00+00:00'), ts('2026-07-12T11:00:00+00:00'))
        self.assertEqual(month_start, ts('2026-06-30T22:00:00+00:00'))

    def test_cross_month_rejected(self):
        with self.assertRaises(ValueError):
            validate_period(ts('2026-10-31T22:00:00+00:00'), ts('2026-11-01T00:00:00+00:00'))

    def test_meter_query_parameterized(self):
        cursor = FakeCursor([[]])
        month_start = ts('2026-10-31T23:00:00+00:00')
        end = ts('2026-11-12T11:00:00+00:00')
        result = fetch_meter_readings(cursor, device_id='aidon_main', month_start_utc=month_start, end_utc=end)
        self.assertEqual(result, [])
        self.assertEqual(len(cursor.calls), 1)
        query, params = cursor.calls[0]
        self.assertEqual(query.count('%s'), 3)
        self.assertEqual(params[0], 'aidon_main')
        self.assertEqual(params[1], month_start)
        self.assertEqual(params[2], ts('2026-11-12T11:02:00+00:00'))

    def test_meter_duplicate_rejected(self):
        row = {'device_id': 'aidon_main', 'measured_at': ts('2026-11-12T10:00:11+00:00'), 'cumulative_kwh': D('100'), 'quality': 'valid', 'unit': 'kWh'}
        cursor = FakeCursor([[row, row]])
        with self.assertRaises(ValueError):
            fetch_meter_readings(cursor, device_id='aidon_main', month_start_utc=ts('2026-10-31T23:00:00+00:00'), end_utc=ts('2026-11-12T11:00:00+00:00'))

    def test_spot_query_parameterized(self):
        cursor = FakeCursor([[]])
        start = ts('2026-11-12T10:00:00+00:00')
        end = ts('2026-11-12T11:00:00+00:00')
        result = fetch_spot_prices(cursor, price_area='NO2', start_utc=start, end_utc=end)
        self.assertEqual(result, {})
        query, params = cursor.calls[0]
        self.assertEqual(query.count('%s'), 3)
        self.assertEqual(params, ('NO2', start, end))

    def test_spot_duplicate_rejected(self):
        row = {'price_area': 'NO2', 'period_start': ts('2026-11-12T10:00:00+00:00'), 'period_end': ts('2026-11-12T11:00:00+00:00'), 'price_nok_kwh': D('1.25'), 'includes_vat': False}
        cursor = FakeCursor([[row, row]])
        with self.assertRaises(ValueError):
            fetch_spot_prices(cursor, price_area='NO2', start_utc=row['period_start'], end_utc=row['period_end'])

    def test_agreement_conflict_rejected(self):
        first = agreement()
        second = dict(first, id=2)
        cursor = FakeCursor([[first, second]])
        with self.assertRaises(ValueError):
            fetch_agreement(cursor, device_id='aidon_main', price_area='NO2')

    def test_full_load_contract(self):
        cursor = FakeCursor([[agreement()], [{'device_id': 'aidon_main', 'measured_at': ts('2026-11-12T10:00:11+00:00'), 'cumulative_kwh': D('100'), 'quality': 'valid', 'unit': 'kWh'}], [{'price_area': 'NO2', 'period_start': ts('2026-11-12T10:00:00+00:00'), 'period_end': ts('2026-11-12T11:00:00+00:00'), 'price_nok_kwh': D('1.25'), 'includes_vat': False}]])
        result = load_norgespris_data(cursor, device_id='aidon_main', price_area='NO2', start_utc=ts('2026-11-12T10:00:00+00:00'), end_utc=ts('2026-11-12T11:00:00+00:00'))
        self.assertEqual(len(cursor.calls), 3)
        self.assertEqual(len(result['readings']), 1)
        self.assertEqual(len(result['spot_prices']), 1)
        self.assertEqual(result['agreement']['monthly_limit_kwh'], D('5000'))
if __name__ == '__main__':
    unittest.main()
