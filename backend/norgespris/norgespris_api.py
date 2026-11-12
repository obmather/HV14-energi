from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import FastAPI, HTTPException, Query
from fastapi.encoders import jsonable_encoder

from main import get_connection
from norgespris_db import load_norgespris_data
from norgespris_verified import calculate_verified_month

app = FastAPI(title="HV14 Norgespris API – utvikling")


def serialize(value):
    if is_dataclass(value):
        value = asdict(value)
    return jsonable_encoder(
        value,
        custom_encoder={Decimal: str},
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "norgespris-dev"}


@app.get("/api/v1/norgespris/month")
def norgespris_month(
    start_utc: datetime = Query(...),
    end_utc: datetime = Query(...),
    device_id: str = "aidon_main",
    price_area: str = "NO2",
):
    if start_utc.tzinfo is None or end_utc.tzinfo is None:
        raise HTTPException(
            status_code=422,
            detail="Timezone-aware timestamps required",
        )

    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SET TRANSACTION READ ONLY")

                data = load_norgespris_data(
                    cursor,
                    device_id=device_id,
                    price_area=price_area,
                    start_utc=start_utc,
                    end_utc=end_utc,
                )

                agreement = data["agreement"]

                results = calculate_verified_month(
                    readings=data["readings"],
                    device_id=data["device_id"],
                    first_hour_utc=data["first_hour_utc"],
                    end_utc=data["end_utc"],
                    spot_prices=data["spot_prices"],
                    valid_from=agreement["valid_from"],
                    valid_to=agreement["valid_to"],
                    fixed_price_nok_kwh=agreement[
                        "fixed_price_nok_kwh"
                    ],
                    monthly_limit_kwh=agreement[
                        "monthly_limit_kwh"
                    ],
                )

                conn.rollback()

        return serialize({
            "device_id": device_id,
            "price_area": price_area,
            "start_utc": start_utc,
            "end_utc": end_utc,
            "agreement": agreement,
            "hours": results,
        })

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        )


@app.get("/api/v1/norgespris/summary")
def norgespris_summary(
    start_utc: datetime = Query(...),
    end_utc: datetime = Query(...),
    device_id: str = "aidon_main",
    price_area: str = "NO2",
):
    if start_utc.tzinfo is None or end_utc.tzinfo is None:
        raise HTTPException(
            status_code=422,
            detail="Timezone-aware timestamps required",
        )

    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SET TRANSACTION READ ONLY")

                data = load_norgespris_data(
                    cursor,
                    device_id=device_id,
                    price_area=price_area,
                    start_utc=start_utc,
                    end_utc=end_utc,
                )

                agreement = data["agreement"]

                hours = calculate_verified_month(
                    readings=data["readings"],
                    device_id=data["device_id"],
                    first_hour_utc=data["first_hour_utc"],
                    end_utc=data["end_utc"],
                    spot_prices=data["spot_prices"],
                    valid_from=agreement["valid_from"],
                    valid_to=agreement["valid_to"],
                    fixed_price_nok_kwh=agreement[
                        "fixed_price_nok_kwh"
                    ],
                    monthly_limit_kwh=agreement[
                        "monthly_limit_kwh"
                    ],
                )

                conn.rollback()

        statuses = {}
        for hour in hours:
            statuses[hour.status] = (
                statuses.get(hour.status, 0) + 1
            )

        verified = [
            hour for hour in hours
            if hour.status == "valid"
            and hour.eligible_kwh is not None
            and hour.adjustment_nok_ex_vat is not None
        ]

        complete = len(verified) == len(hours) and bool(hours)

        total_eligible = (
            sum(
                (hour.eligible_kwh for hour in verified),
                Decimal("0"),
            )
            if complete else None
        )

        total_adjustment = (
            sum(
                (
                    hour.adjustment_nok_ex_vat
                    for hour in verified
                ),
                Decimal("0"),
            )
            if complete else None
        )

        return serialize({
            "device_id": device_id,
            "price_area": price_area,
            "start_utc": start_utc,
            "end_utc": end_utc,
            "agreement": agreement,
            "status": (
                "complete" if complete
                else "incomplete"
            ),
            "total_hours": len(hours),
            "verified_hours": len(verified),
            "hour_statuses": statuses,
            "eligible_kwh": total_eligible,
            "adjustment_nok_ex_vat": total_adjustment,
        })

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        )
