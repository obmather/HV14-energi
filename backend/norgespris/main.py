import os
from datetime import datetime
from pathlib import Path

import psycopg
from fastapi import FastAPI, HTTPException, Query
from psycopg.rows import dict_row

app = FastAPI(
    title="HV14 Energy API",
    version="0.2.0",
)

DB_PASSWORD_FILE = Path("/run/secrets/energy_db_password")


def get_connection():
    return psycopg.connect(
        host=os.environ["DB_HOST"],
        port=5432,
        dbname="hv14_energy",
        user="hv14_energy",
        password=DB_PASSWORD_FILE.read_text().strip(),
        connect_timeout=5,
        row_factory=dict_row,
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "hv14-energy-api",
    }


@app.get("/health/database")
def database_health():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT current_database() AS database, "
                "current_user AS username"
            )
            result = cur.fetchone()

    return {
        "status": "ok",
        **result,
    }


@app.get("/api/v1/devices")
def list_devices():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    id,
                    device_id,
                    name,
                    manufacturer,
                    model,
                    source_type,
                    active,
                    created_at
                FROM energy_devices
                ORDER BY id
            """)
            return {"devices": cur.fetchall()}


@app.get("/api/v1/measurements/latest")
def latest_measurements():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT ON (
                    m.device_id,
                    m.measurement_type
                )
                    m.id,
                    d.device_id,
                    d.name AS device_name,
                    m.measurement_type,
                    m.value,
                    m.unit,
                    m.measured_at,
                    m.received_at,
                    m.quality
                FROM energy_measurements m
                JOIN energy_devices d
                    ON d.id = m.device_id
                ORDER BY
                    m.device_id,
                    m.measurement_type,
                    m.measured_at DESC,
                    m.id DESC
            """)
            return {"measurements": cur.fetchall()}


@app.get("/api/v1/measurements/history")
def measurement_history(
    device_id: str,
    measurement_type: str,
    start: datetime,
    end: datetime,
    limit: int = Query(default=1000, ge=1, le=10000),
):
    if start.tzinfo is None or end.tzinfo is None:
        raise HTTPException(
            status_code=422,
            detail="start and end must include timezone",
        )

    if start >= end:
        raise HTTPException(
            status_code=422,
            detail="start must be before end",
        )

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    m.id,
                    d.device_id,
                    m.measurement_type,
                    m.value,
                    m.unit,
                    m.measured_at,
                    m.received_at,
                    m.quality
                FROM energy_measurements m
                JOIN energy_devices d
                    ON d.id = m.device_id
                WHERE d.device_id = %s
                  AND m.measurement_type = %s
                  AND m.measured_at >= %s
                  AND m.measured_at < %s
                ORDER BY m.measured_at ASC
                LIMIT %s
            """, (
                device_id,
                measurement_type,
                start,
                end,
                limit,
            ))

            return {"measurements": cur.fetchall()}


@app.get("/api/v1/devices/states")
def latest_device_states():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    d.device_id,
                    d.name,
                    s.state,
                    s.reported_at,
                    s.received_at
                FROM energy_device_states s
                JOIN energy_devices d
                    ON d.id = s.device_id
                ORDER BY d.name, d.device_id
            """)

            return {"devices": cur.fetchall()}


@app.get("/api/v1/consumption/period")
def period_consumption(
    device_id: str,
    start: datetime,
    end: datetime,
):
    from decimal import Decimal

    if start.tzinfo is None or end.tzinfo is None:
        raise HTTPException(
            status_code=422,
            detail="start and end must include timezone",
        )

    if start >= end:
        raise HTTPException(
            status_code=422,
            detail="start must be before end",
        )

    max_gap_seconds = 65 * 60

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id
                FROM energy_devices
                WHERE device_id = %s
            """, (device_id,))

            device = cur.fetchone()

            if device is None:
                raise HTTPException(
                    status_code=404,
                    detail="Device not found",
                )

            cur.execute("""
                SELECT measured_at, value
                FROM energy_measurements
                WHERE device_id = %s
                  AND measurement_type = 'energy_total'
                  AND measured_at >= %s
                  AND measured_at <= %s
                ORDER BY measured_at, id
            """, (device["id"], start, end))

            readings = cur.fetchall()

    consumption = Decimal("0")
    valid_intervals = 0
    missing_intervals = 0
    possible_resets = 0

    for previous, current in zip(readings, readings[1:]):

        elapsed = (
            current["measured_at"] -
            previous["measured_at"]
        ).total_seconds()

        difference = current["value"] - previous["value"]

        if difference < 0:
            possible_resets += 1
            continue

        if elapsed > max_gap_seconds:
            # Manglende timeavlesning.
            # Ikke fordel eller estimer forbruket.
            missing_intervals += 1
            continue

        if elapsed <= 0:
            missing_intervals += 1
            continue

        consumption += difference
        valid_intervals += 1

    first_time = readings[0]["measured_at"] if readings else None
    last_time = readings[-1]["measured_at"] if readings else None

    coverage_start_seconds = (
        (first_time - start).total_seconds()
        if first_time else None
    )

    coverage_end_seconds = (
        (end - last_time).total_seconds()
        if last_time else None
    )

    coverage_within_tolerance = (
        len(readings) >= 2
        and coverage_start_seconds <= max_gap_seconds
        and coverage_end_seconds <= max_gap_seconds
        and missing_intervals == 0
        and possible_resets == 0
    )

    complete = (
        len(readings) >= 2
        and first_time == start
        and last_time == end
        and missing_intervals == 0
        and possible_resets == 0
    )

    return {
        "device_id": device_id,
        "start": start,
        "end": end,
        "consumption_kwh": (
            consumption if valid_intervals > 0 else None
        ),
        "reading_count": len(readings),
        "valid_intervals": valid_intervals,
        "missing_intervals": missing_intervals,
        "possible_counter_resets": possible_resets,
        "first_reading_at": first_time,
        "last_reading_at": last_time,
        "coverage_start_gap_seconds": coverage_start_seconds,
        "coverage_end_gap_seconds": coverage_end_seconds,
        "max_allowed_gap_seconds": max_gap_seconds,
        "complete_period": complete,
        "coverage_within_tolerance": coverage_within_tolerance,
        "calculation": "validated_counter_differences",
    }




@app.get("/api/v1/consumption/hourly")
def hourly_consumption(
    device_id: str,
    start: datetime,
    end: datetime,
):
    from datetime import timedelta, timezone
    from decimal import Decimal
    from zoneinfo import ZoneInfo

    oslo = ZoneInfo("Europe/Oslo")
    utc = timezone.utc
    hour = timedelta(hours=1)
    tolerance = timedelta(minutes=2)

    if start.tzinfo is None or end.tzinfo is None:
        raise HTTPException(
            status_code=422,
            detail="start and end must include timezone",
        )

    start = start.astimezone(utc)
    end = end.astimezone(utc)

    if start >= end:
        raise HTTPException(
            status_code=422,
            detail="start must be before end",
        )

    if end - start > timedelta(days=31):
        raise HTTPException(
            status_code=422,
            detail="Maximum period is 31 days",
        )

    if (
        start.minute or start.second or start.microsecond
        or end.minute or end.second or end.microsecond
    ):
        raise HTTPException(
            status_code=422,
            detail="start and end must be whole hours",
        )

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id FROM energy_devices
                WHERE device_id = %s
            """, (device_id,))
            device = cur.fetchone()

            if device is None:
                raise HTTPException(
                    status_code=404,
                    detail="Device not found",
                )

            # Leser også nærmeste avlesning etter slutten
            # og før starten for å kunne beregne grensetimer.
            cur.execute("""
                SELECT measured_at, value
                FROM energy_measurements
                WHERE device_id = %s
                  AND measurement_type = 'energy_total'
                  AND measured_at >= %s
                  AND measured_at <= %s
                ORDER BY measured_at, id
            """, (
                device["id"],
                start - tolerance,
                end + tolerance,
            ))

            readings = cur.fetchall()

            cur.execute("""
                SELECT period_start, period_end,
                       price_nok_kwh
                FROM energy_spot_prices
                WHERE price_area = 'NO2'
                  AND period_start < %s
                  AND period_end > %s
                ORDER BY period_start
            """, (end, start))

            prices = cur.fetchall()

    # Knytt avlesninger til nærmeste hele UTC-time.
    # Ved flere avlesninger velges den nærmeste.
    readings_by_hour = {}

    for reading in readings:
        measured = reading["measured_at"].astimezone(utc)

        rounded = (
            measured + timedelta(minutes=30)
        ).replace(minute=0, second=0, microsecond=0)

        deviation = abs(measured - rounded)

        if deviation > tolerance:
            continue

        previous = readings_by_hour.get(rounded)

        if (
            previous is None
            or deviation < previous["deviation"]
        ):
            readings_by_hour[rounded] = {
                "value": Decimal(str(reading["value"])),
                "measured_at": measured,
                "deviation": deviation,
            }

    prices_by_hour = {
        p["period_start"].astimezone(utc): p
        for p in prices
        if (
            p["period_end"].astimezone(utc)
            - p["period_start"].astimezone(utc)
        ) == hour
    }

    hours = []
    total_kwh = Decimal("0")
    total_cost = Decimal("0")
    valid_hours = 0
    priced_hours = 0
    missing_hours = 0

    current_hour = start

    while current_hour < end:
        next_hour = current_hour + hour

        first = readings_by_hour.get(current_hour)
        last = readings_by_hour.get(next_hour)

        consumption = None
        spot = None
        cost = None
        status = "missing_measurement"

        if first is not None and last is not None:
            elapsed = (
                last["measured_at"]
                - first["measured_at"]
            ).total_seconds()

            difference = last["value"] - first["value"]

            if difference < 0:
                status = "possible_counter_reset"

            elif not 55 * 60 <= elapsed <= 65 * 60:
                status = "invalid_interval"

            else:
                consumption = difference
                total_kwh += consumption
                valid_hours += 1

                price = prices_by_hour.get(current_hour)

                if price is None:
                    status = "missing_price"
                else:
                    spot = Decimal(
                        str(price["price_nok_kwh"])
                    )
                    cost = consumption * spot
                    total_cost += cost
                    priced_hours += 1
                    status = "valid"

        if consumption is None:
            missing_hours += 1

        hours.append({
            "hour_start": current_hour,
            "hour_end": next_hour,
            "hour_local": current_hour.astimezone(oslo),
            "consumption_kwh": consumption,
            "spot_price_nok_kwh": spot,
            "spot_cost_nok_ex_vat": cost,
            "status": status,
        })

        current_hour = next_hour

    expected_hours = len(hours)

    return {
        "device_id": device_id,
        "price_area": "NO2",
        "start": start,
        "end": end,
        "hours": hours,
        "expected_hours": expected_hours,
        "valid_hours": valid_hours,
        "priced_hours": priced_hours,
        "missing_hours": missing_hours,
        "total_consumption_kwh": (
            total_kwh if valid_hours else None
        ),
        "total_spot_cost_nok_ex_vat": (
            total_cost if priced_hours else None
        ),
        "complete_period": (
            valid_hours == expected_hours
        ),
        "complete_cost_period": (
            priced_hours == expected_hours
        ),
    }


@app.get("/api/v1/system/status")
def system_status():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    (SELECT COUNT(*) FROM energy_devices)
                        AS device_count,
                    (SELECT COUNT(*) FROM energy_measurements)
                        AS measurement_count
            """)
            result = cur.fetchone()

    return {
        "status": "ok",
        "database": "connected",
        **result,
    }


# HV14 Energy - Spot prices
from prices_api import router as prices_router
app.include_router(prices_router)
