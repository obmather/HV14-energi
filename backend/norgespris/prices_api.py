from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query
from psycopg.rows import dict_row

router = APIRouter(prefix="/api/v1/prices", tags=["Prices"])

OSLO = ZoneInfo("Europe/Oslo")

PRICE_COLUMNS = """
    price_area,
    period_start,
    period_end,
    price_nok_kwh,
    original_price_nok_kwh,
    includes_vat,
    source,
    retrieved_at
"""


def connection():
    from main import get_connection
    return get_connection()


def get_prices(start, end, area, limit=10000):
    with connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                f"""
                SELECT {PRICE_COLUMNS}
                FROM energy_spot_prices
                WHERE price_area = %s
                  AND period_start < %s
                  AND period_end > %s
                ORDER BY period_start ASC
                LIMIT %s
                """,
                (area, end, start, limit),
            )
            return cur.fetchall()


def local_day_range(day):
    start = datetime(
        day.year, day.month, day.day,
        tzinfo=OSLO,
    )
    return start, start + timedelta(days=1)


@router.get("/current")
def current_price(
    area: str = Query(default="NO2", pattern="^NO[1-5]$"),
):
    now = datetime.now(timezone.utc)

    with connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                f"""
                SELECT {PRICE_COLUMNS}
                FROM energy_spot_prices
                WHERE price_area = %s
                  AND period_start <= %s
                  AND period_end > %s
                ORDER BY period_start DESC
                LIMIT 1
                """,
                (area, now, now),
            )
            price = cur.fetchone()

    if price is None:
        raise HTTPException(
            status_code=404,
            detail="No price available for current period",
        )

    return {
        "price_area": area,
        "price": price,
    }


@router.get("/today")
def today_prices(
    area: str = Query(default="NO2", pattern="^NO[1-5]$"),
):
    day = datetime.now(OSLO).date()
    start, end = local_day_range(day)

    prices = get_prices(start, end, area)

    return {
        "price_area": area,
        "date": day.isoformat(),
        "period_count": len(prices),
        "prices": prices,
    }


@router.get("/tomorrow")
def tomorrow_prices(
    area: str = Query(default="NO2", pattern="^NO[1-5]$"),
):
    day = datetime.now(OSLO).date() + timedelta(days=1)
    start, end = local_day_range(day)

    prices = get_prices(start, end, area)

    return {
        "price_area": area,
        "date": day.isoformat(),
        "published": len(prices) > 0,
        "period_count": len(prices),
        "prices": prices,
    }


@router.get("/history")
def price_history(
    start: datetime,
    end: datetime,
    area: str = Query(default="NO2", pattern="^NO[1-5]$"),
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

    prices = get_prices(start, end, area, limit)

    return {
        "price_area": area,
        "start": start,
        "end": end,
        "period_count": len(prices),
        "prices": prices,
    }
