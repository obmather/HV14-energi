# HV14 Energi – Norgespris contract (confirmed 2026-11-12, status=incomplete only)

- Requests `/energy/api/v1/norgespris/summary` and `/month` with `start_utc`, `end_utc` (Oslo calendar month as UTC ISO), `device_id=aidon_main`, `price_area=NO2`. 403/422/5xx show specific messages.
- Common envelope: `{ device_id, price_area, start_utc, end_utc, agreement: { id, valid_from, valid_to, fixed_price_nok_kwh, monthly_limit_kwh, price_area } | null }`. Decimals arrive as strings (e.g. "0.400000") and are parsed to numbers.
- Summary adds `{ status, total_hours, verified_hours, hour_statuses: {status: count}, eligible_kwh, adjustment_nok_ex_vat }`.
- Month adds `hours: [{ hour_start, eligible_kwh, adjustment_nok_ex_vat, status }]` (no end, no envelope status).
- No verified `status=complete` example exists yet; amounts are shown only when summary status is exactly "complete" and the value is non-null. Null stays null ("—"); frontend never computes adjustments. Mapping lives only in `src/lib/energy/norgespris-client.ts`.
