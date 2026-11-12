from datetime import datetime, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from norgespris_coverage import (
    MeterReading,
    verify_coverage,
)


OSLO = ZoneInfo("Europe/Oslo")
UTC = timezone.utc


def verify_month_baseline(
    readings: list[MeterReading],
    *,
    device_id: str,
    first_hour_utc: datetime,
) -> Decimal | None:
    """
    Verifiserer kumulativt forbruk fra lokal månedsstart
    frem til første beregningstime.

    Returnerer:
        Decimal: Dokumentert forbruk tidligere i måneden.
        None: Manglende eller ugyldig måledekning.

    Totimersintervaller kan brukes til samlet forbruk,
    men ikke til individuell timeprisberegning.
    """

    if first_hour_utc.tzinfo is None:
        return None

    first_hour_utc = first_hour_utc.astimezone(UTC)

    if (
        first_hour_utc.minute != 0
        or first_hour_utc.second != 0
        or first_hour_utc.microsecond != 0
    ):
        return None

    local_time = first_hour_utc.astimezone(OSLO)

    month_start_local = datetime(
        local_time.year,
        local_time.month,
        1,
        0,
        0,
        tzinfo=OSLO,
    )

    month_start_utc = month_start_local.astimezone(UTC)

    if first_hour_utc < month_start_utc:
        return None

    if first_hour_utc == month_start_utc:
        return Decimal("0")

    coverage = verify_coverage(
        readings,
        device_id=device_id,
        start_utc=month_start_utc,
        end_utc=first_hour_utc,
    )

    if coverage.status != "complete":
        return None

    return coverage.total_kwh
