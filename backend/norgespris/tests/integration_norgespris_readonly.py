from datetime import timedelta, timezone
from decimal import Decimal

from main import get_connection
from norgespris_db import load_norgespris_data
from norgespris_verified import calculate_verified_month

UTC = timezone.utc

def utc_hour(value):
    return value.astimezone(UTC).replace(
        minute=0,
        second=0,
        microsecond=0,
    )

conn = get_connection()

try:
    with conn.cursor() as cur:
        # Må være første SQL-kommando i transaksjonen.
        cur.execute("SET TRANSACTION READ ONLY")

        cur.execute("SHOW transaction_read_only")
        mode = cur.fetchone()["transaction_read_only"]

        if mode != "on":
            raise RuntimeError(
                "STOPP: Databasetransaksjonen er ikke skrivebeskyttet"
            )

        print("Transaksjon: READ ONLY")

        cur.execute(
            """
            SELECT
                MAX(m.measured_at) AS latest
            FROM energy_measurements AS m
            JOIN energy_devices AS d
              ON d.id = m.device_id
            WHERE d.device_id = %s
              AND m.measurement_type = 'energy_total'
              AND m.unit = 'kWh'
              AND m.quality = 'valid'
            """,
            ("aidon_main",),
        )

        latest = cur.fetchone()["latest"]

        if latest is None:
            raise RuntimeError("Ingen gyldige Aidon-avlesninger")

        # Velger én historisk time med eksisterende måledata.
        # Ingen antakelse om at siste avlesning er fra i dag.
        end = utc_hour(latest)
        start = end - timedelta(hours=1)

        print("Testperiode UTC:", start, "til", end)

        data = load_norgespris_data(
            cur,
            device_id="aidon_main",
            price_area="NO2",
            start_utc=start,
            end_utc=end,
        )

        print("Månedsstart UTC:", data["month_start_utc"])
        print("Måleravlesninger:", len(data["readings"]))
        print("Spotpristimer:", len(data["spot_prices"]))

        agreement = data["agreement"]

        print("Avtale-ID:", agreement["id"])
        print(
            "Fastpris eks. mva.:",
            agreement["fixed_price_nok_kwh"],
        )
        print(
            "Månedstak kWh:",
            agreement["monthly_limit_kwh"],
        )

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

        print("Beregnede timer:", len(results))

        for result in results:
            print("Time:", result.hour_start)
            print("Status:", result.status)
            print("Berettiget kWh:", result.eligible_kwh)
            print(
                "Justering eks. mva.:",
                result.adjustment_nok_ex_vat,
            )

            # Novembergrunnlaget er ikke komplett.
            # Ingen økonomisk justering skal produseres
            # uten dokumentert månedsgrunnlag.
            if result.adjustment_nok_ex_vat is not None:
                raise RuntimeError(
                    "STOPP: Uventet økonomisk beregning "
                    "uten verifisert månedsgrunnlag"
                )

        print("Konservativ beregningskontroll: OK")

finally:
    conn.rollback()
    conn.close()
    print("Transaksjon avsluttet med ROLLBACK")
