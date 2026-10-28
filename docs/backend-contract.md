# HV14 Water – backend contract

The frontend is aligned with the FastAPI contract supplied on 2026-10-26.
All field mapping is isolated in `src/lib/water/api-client.ts`.
Live integration against the real backend has **not** been tested from the Lovable environment.

## Configuration (production, Docker on the private HV14 server)
```env
VITE_HV14_API_BASE_URL=
VITE_HV14_DATA_MODE=api
VITE_HV14_FRESHNESS_HOURS=8
```
- Empty base URL = same-origin requests to `/api/...`. The Docker setup must serve the frontend and proxy `/api` to FastAPI on the same origin (no CORS needed).
- `VITE_HV14_DATA_MODE=mock` (or no config at all) runs clearly labeled simulated data for development.
- No IP addresses, public URLs or credentials are hardcoded.

## Endpoints
| Endpoint | Shape | Used for |
|---|---|---|
| `GET /api/meters` | `{ meters: [{ meter_id, serial_number, dev_eui, manufacturer, model, preferred_driver_key }] }` | Physical meters |
| `GET /api/measurement-points` | `{ measurement_points: [{ channel_id, channel_name, included_in_site_total, meter_id, installed_at }] }` | Names and meter→channel links (authoritative) |
| `GET /api/meters/{id}/latest` | `{ meter_id, reading_at, reading_kind, volume_l, volume_m3 }` | Latest register (404 = no reading) |
| `GET /api/meters/{id}/readings` | `{ meter_id, count, readings: [{ reading_at, reading_kind, volume_l, volume_m3, interval_consumption_l }] }`, newest first | History table and hourly consumption |
| `GET /api/consumption?channel_id=&period=daily&limit=` | `{ channel_id, period, count, readings: [{ period_start, consumption_l, quality_status }] }` | Daily consumption (backend-calculated) |

## Rules applied
- Daily consumption comes from `/api/consumption` (period `daily` only – no undocumented periods are used).
- A recorded `consumption_l: 0` stays 0; days absent from the response are shown as missing, never 0.
- `quality_status` is preserved; `partial` is drawn differently and labeled "Delvise data".
- Hourly consumption is derived from differences in the cumulative `volume_m3` register, so instant and hourly readings in the same hour are never double-counted.
- `interval_consumption_l: null` is kept as null (unknown), never 0.
- Zero consumption on MP 2 produces no alert.

## Remaining assumptions / limitations
1. `/api/consumption` is assumed to return the **latest** `limit` periods. The app requests enough days to cover the selected range (max 400).
2. `period_start` is assumed to be an Europe/Oslo calendar day.
3. `/readings` has no date-range parameters, so full history is fetched and filtered client-side; this may become slow as history grows.
4. `interval_consumption_l` is parsed but not used for charts, since it is undocumented whether it covers the hour before or after `reading_at`.
5. If `/api/measurement-points` fails, meters fall back to built-in names for meters 1 and 2.
6. No message reception timestamp (`received_at`) is exposed by the backend.
