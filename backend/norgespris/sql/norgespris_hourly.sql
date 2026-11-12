-- HV14 Energi: Hourly consumption and spot prices
--
-- Parameters:
--   $1 = device_id (text)
--   $2 = price_area (text)
--   $3 = start_utc (timestamptz)
--   $4 = end_utc (timestamptz, exclusive)
--
-- Returns one row per UTC hour.
-- Missing hourly consumption is never estimated.

WITH parameters AS (
    SELECT
        $1::text AS device_id,
        $2::text AS price_area,
        $3::timestamptz AS start_utc,
        $4::timestamptz AS end_utc
    WHERE $3::timestamptz = date_trunc('hour', $3::timestamptz, 'UTC')
      AND $4::timestamptz = date_trunc('hour', $4::timestamptz, 'UTC')
      AND $4::timestamptz > $3::timestamptz
),
readings AS (
    SELECT
        m.measured_at,
        m.value AS cumulative_kwh,
        LAG(m.measured_at) OVER (
            ORDER BY m.measured_at
        ) AS previous_at,
        LAG(m.value) OVER (
            ORDER BY m.measured_at
        ) AS previous_kwh
    FROM energy_measurements m
    JOIN energy_devices d
        ON d.id = m.device_id
    CROSS JOIN parameters p
    WHERE d.device_id = p.device_id
      AND m.measurement_type = 'energy_total'
      AND m.unit = 'kWh'
      AND m.quality = 'valid'
      AND m.measured_at >= p.start_utc
      AND m.measured_at <= p.end_utc
                             + INTERVAL '120 seconds'
),
valid_intervals AS (
    SELECT
        date_trunc('hour', previous_at, 'UTC') AS hour_start,
        cumulative_kwh - previous_kwh AS consumption_kwh
    FROM readings
    WHERE previous_at IS NOT NULL
      AND measured_at - previous_at
          BETWEEN INTERVAL '55 minutes'
              AND INTERVAL '65 minutes'
      AND cumulative_kwh >= previous_kwh
      AND measured_at - date_trunc('hour', measured_at, 'UTC')
          BETWEEN INTERVAL '0 seconds'
              AND INTERVAL '120 seconds'
      AND previous_at - date_trunc('hour', previous_at, 'UTC')
          BETWEEN INTERVAL '0 seconds'
              AND INTERVAL '120 seconds'
),
hours AS (
    SELECT
        generate_series(
            p.start_utc,
            p.end_utc - INTERVAL '1 hour',
            INTERVAL '1 hour'
        ) AS hour_start
    FROM parameters p
    WHERE p.end_utc > p.start_utc
)
SELECT
    h.hour_start AS hour_start_utc,
    h.hour_start AT TIME ZONE 'Europe/Oslo'
        AS hour_start_local,
    v.consumption_kwh,
    sp.price_nok_kwh AS spot_nok_kwh_ex_vat,
    CASE
        WHEN v.consumption_kwh IS NULL
        THEN 'missing_consumption'
        WHEN sp.id IS NULL
        THEN 'missing_spot_price'
        ELSE 'valid'
    END AS status
FROM hours h
CROSS JOIN parameters p
LEFT JOIN valid_intervals v
    ON v.hour_start = h.hour_start
LEFT JOIN energy_spot_prices sp
    ON sp.price_area = p.price_area
   AND sp.period_start = h.hour_start
   AND sp.period_end = h.hour_start
                       + INTERVAL '1 hour'
   AND sp.includes_vat = false
ORDER BY h.hour_start;
