import unittest
from datetime import date, datetime
from decimal import Decimal
from norgespris_repository import parse_meter_readings, parse_spot_prices, parse_agreement
D = Decimal

def ts(value):
    return datetime.fromisoformat(value)

def meter_row(device_id='aidon_main', value='100'):
    return {'device_id': device_id, 'measured_at': ts('2026-11-12T10:00:11+00:00'), 'cumulative_kwh': None if value is None else D(value), 'quality': 'valid', 'unit': 'kWh'}

def spot_row(price='1.25', includes_vat=False, end='2026-11-12T11:00:00+00:00'):
    return {'price_area': 'NO2', 'period_start': ts('2026-11-12T10:00:00+00:00'), 'period_end': ts(end), 'price_nok_kwh': D(price), 'includes_vat': includes_vat}

def agreement_row(valid_from=date(2025, 10, 17), valid_to=date(2026, 12, 31)):
    return {'id': 1, 'agreement_type': 'norgespris', 'valid_from': valid_from, 'valid_to': valid_to, 'price_nok_kwh_ex_vat': D('0.40'), 'monthly_limit_kwh': D('5000'), 'price_area': 'NO2'}

class RepositorySafetyTests(unittest.TestCase):

    def test_wrong_device_rejected(self):
        with self.assertRaises(ValueError):
            parse_meter_readings([meter_row(device_id='other_meter')], device_id='aidon_main')

    def test_negative_meter_reading_rejected(self):
        with self.assertRaises(ValueError):
            parse_meter_readings([meter_row(value='-1')], device_id='aidon_main')

    def test_missing_meter_value_rejected(self):
        with self.assertRaises(ValueError):
            parse_meter_readings([meter_row(value=None)], device_id='aidon_main')

    def test_spot_with_vat_rejected(self):
        with self.assertRaises(ValueError):
            parse_spot_prices([spot_row(includes_vat=True)], price_area='NO2')

    def test_invalid_spot_interval_rejected(self):
        with self.assertRaises(ValueError):
            parse_spot_prices([spot_row(end='2026-11-12T12:00:00+00:00')], price_area='NO2')

    def test_negative_spot_price_accepted(self):
        result = parse_spot_prices([spot_row(price='-0.25')], price_area='NO2')
        hour = ts('2026-11-12T10:00:00+00:00')
        self.assertEqual(result[hour], D('-0.25'))

    def test_missing_agreement_rejected(self):
        with self.assertRaises(ValueError):
            parse_agreement([], price_area='NO2')

    def test_invalid_agreement_dates_rejected(self):
        with self.assertRaises(ValueError):
            parse_agreement([agreement_row(valid_from=date(2026, 12, 31), valid_to=date(2025, 10, 17))], price_area='NO2')
if __name__ == '__main__':
    unittest.main()
