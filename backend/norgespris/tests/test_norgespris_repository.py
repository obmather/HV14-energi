import unittest
from datetime import date, datetime
from decimal import Decimal
from norgespris_repository import parse_meter_readings, parse_spot_prices, parse_agreement
D = Decimal

def ts(value):
    return datetime.fromisoformat(value)

class RepositoryTests(unittest.TestCase):

    def test_meter_readings(self):
        rows = [{'device_id': 'aidon_main', 'measured_at': ts('2026-11-12T10:00:11+00:00'), 'cumulative_kwh': D('100.5'), 'quality': 'valid', 'unit': 'kWh'}, {'device_id': 'aidon_main', 'measured_at': ts('2026-11-12T11:00:11+00:00'), 'cumulative_kwh': D('103.2'), 'quality': 'valid', 'unit': 'kWh'}]
        result = parse_meter_readings(rows, device_id='aidon_main')
        self.assertEqual(len(result), 2)
        self.assertEqual(result[1].cumulative_kwh, D('103.2'))

    def test_duplicate_meter_timestamp_rejected(self):
        timestamp = ts('2026-11-12T10:00:11+00:00')
        rows = [{'device_id': 'aidon_main', 'measured_at': timestamp, 'cumulative_kwh': D('100'), 'quality': 'valid', 'unit': 'kWh'}, {'device_id': 'aidon_main', 'measured_at': timestamp, 'cumulative_kwh': D('101'), 'quality': 'valid', 'unit': 'kWh'}]
        with self.assertRaises(ValueError):
            parse_meter_readings(rows, device_id='aidon_main')

    def test_spot_prices(self):
        hour = ts('2026-11-12T10:00:00+00:00')
        rows = [{'period_start': hour, 'period_end': ts('2026-11-12T11:00:00+00:00'), 'price_nok_kwh': D('1.25'), 'includes_vat': False, 'price_area': 'NO2'}]
        result = parse_spot_prices(rows, price_area='NO2')
        self.assertEqual(result[hour], D('1.25'))

    def test_duplicate_spot_hour_rejected(self):
        hour = ts('2026-11-12T10:00:00+00:00')
        row = {'period_start': hour, 'period_end': ts('2026-11-12T11:00:00+00:00'), 'price_nok_kwh': D('1.25'), 'includes_vat': False, 'price_area': 'NO2'}
        with self.assertRaises(ValueError):
            parse_spot_prices([row, row], price_area='NO2')

    def test_agreement(self):
        rows = [{'id': 1, 'agreement_type': 'norgespris', 'valid_from': date(2025, 10, 17), 'valid_to': date(2026, 12, 31), 'price_nok_kwh_ex_vat': D('0.40'), 'monthly_limit_kwh': D('5000'), 'price_area': 'NO2'}]
        result = parse_agreement(rows, price_area='NO2')
        self.assertEqual(result['fixed_price_nok_kwh'], D('0.40'))

    def test_overlapping_agreements_rejected(self):
        rows = [{'id': 1, 'agreement_type': 'norgespris', 'valid_from': date(2025, 10, 17), 'valid_to': date(2026, 12, 31), 'price_nok_kwh_ex_vat': D('0.40'), 'monthly_limit_kwh': D('5000'), 'price_area': 'NO2'}, {'id': 2, 'agreement_type': 'norgespris', 'valid_from': date(2026, 1, 1), 'valid_to': date(2026, 12, 31), 'price_nok_kwh_ex_vat': D('0.40'), 'monthly_limit_kwh': D('5000'), 'price_area': 'NO2'}]
        with self.assertRaises(ValueError):
            parse_agreement(rows, price_area='NO2')
if __name__ == '__main__':
    unittest.main()
