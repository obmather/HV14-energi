# HV14 Energi – Norgespris contract (UNVERIFIED)

- Requests `${ENERGY_API_V1}/norgespris/summary` and `/norgespris/month` with `start_utc`, `end_utc` (Oslo calendar month, ISO with `Z`), `device_id=aidon_main`, `price_area=NO2`. Served through the HV14 Nginx proxy at /energy/api/v1/norgespris/*. 403/422/5xx show specific messages — failures show a visible error.
- Assumed summary: `{ status: "complete"|"incomplete", verified_hours, expected_hours, adjustment_nok_ex_vat, agreement: { fixed_price_nok_kwh_ex_vat, monthly_cap_kwh, valid_from, valid_to } }`.
- Assumed month: `{ status, hours: [{ period_start, period_end, consumption_kwh, spot_price_nok_kwh_ex_vat, adjustment_nok_ex_vat, status }] }`.
- Field mapping lives only in `src/lib/energy/norgespris-client.ts`. Other shapes fail visibly. Null stays null (shown as “—”); frontend never computes adjustments. Adjustment is shown only when status is complete.
