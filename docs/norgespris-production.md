# HV14 Energi – Norgespris produksjon

## Formål

Norgespris beregner timebasert forskjell mellom spotpris
i NO2 og avtalt Norgespris for dokumentert strømforbruk.

Løsningen benytter Aidon-hovedmåleren som datakilde.

## Arkitektur

Frontend:
- HV14 Energi
- /energi/strompriser

API:
- FastAPI
- norgespris_api:app
- Intern port 8000

Database:
- PostgreSQL
- hv14_energy
- Eksisterende energy_measurements
- Eksisterende spotprisdata

## Beregningsprinsipper

- Timesforbruk beregnes fra kumulative Aidon-målerstander.
- Målerstander normaliseres til nærmeste hele time
  innenfor to minutters toleranse.
- Manglende målinger estimeres ikke.
- Fler-timesintervaller fordeles ikke på enkelttimer.
- Norgespris er 0,40 NOK/kWh ekskl. mva.
- Månedstaket på 5000 kWh beholdes.
- Ufullstendig månedshistorikk gir foreløpige beregninger.
- Foreløpige beløp er ikke verifiserte månedsoppgjør.

## Produksjonscontainer

Navn: hv14-energy-norgespris

Image: hv14-energy-norgespris:1.0.0

Docker-nettverk: water-db_default

Restart policy: unless-stopped

Ingen bind-mount av kildekode.

## Hemmeligheter

Databasepassord lagres utenfor Git:

/opt/hv14/energy/secrets/db_password

Passord skal aldri legges inn i repositoryet.

## Bygg

Fra backend/norgespris:

docker compose build

## Oppstart

docker compose up -d

## Status

docker compose ps

## Logger

docker compose logs --tail=100

## Tilbakeføring

Tidligere utviklingscontainer beholdes under migreringen.

Ved feil:
1. Stopp ny produksjonscontainer.
2. Gjenopprett proxy-ruting til tidligere API-container.
3. Bekreft at eksisterende API svarer.

## Git

Backend-kode, Dockerfile, Compose-konfigurasjon,
tester og driftsdokumentasjon skal versjoneres.

Ingen databasepassord eller private nøkler skal lagres i Git.

## Produksjonsstatus – 12. november 2026

Norgespris-API-et er satt i produksjon.

Aktiv container:
- hv14-energy-norgespris

Docker-image:
- hv14-energy-norgespris:1.0.0

Oppstart:
- Docker Compose
- restart: unless-stopped

Database:
- hv14_energy
- PostgreSQL-container: hv14-water-postgres
- Docker-nettverk: water-db_default

API:
- FastAPI
- Intern port: 8000
- Lokal kontrollport: 127.0.0.1:18083

Produksjonsproxy:
- Container: hv14-water-proxy
- Konfigurasjon: /opt/hv14/water-frontend/nginx.conf
- API-rute: /energy/api/v1/norgespris/
- Upstream: http://hv14-energy-norgespris:8000/api/v1/norgespris/

Produksjons-API-et er også koblet til:
- water-frontend_frontend_internal

Tilgang til Norgespris-ruten er begrenset med
nginx allow/deny-regler for interne adresser og Tailscale.
IP-baserte regler er ikke en erstatning for autentisering.

## Verifisert produksjonsberegning

Kontrollperiode:
2026-11-12T10:00:00Z til 2026-11-12T16:00:00Z

Resultat:
- 6 beregnede timer
- 22,33 kWh
- +32,94 NOK ekskl. mva.

Resultatet var identisk mellom utviklings- og
produksjonscontaineren.

## Oppgradering

1. Oppdater kildekoden fra Git.
2. Bygg nytt versjonert Docker-image.
3. Start ny container.
4. Kontroller API-resultat.
5. Oppdater nginx-ruting ved behov.
6. Behold tidligere image til ny versjon er godkjent.

## Tilbakeføring

Tidligere utviklingscontainer:
hv14-energy-norgespris-dev

Tidligere nginx-upstream:
http://hv14-energy-norgespris-dev:8000/api/v1/norgespris/

Sikkerhetskopi av nginx-konfigurasjon:
/opt/hv14/water-frontend/nginx.conf.pre-209F

Ved tilbakeføring:
1. Gjenopprett nginx-konfigurasjonen fra sikkerhetskopi.
2. Kjør nginx -t.
3. Last nginx på nytt.
4. Kontroller API-resultat gjennom produksjonsproxy.

Utviklingscontaineren skal ikke slettes før
produksjonsoppsettet er endelig godkjent.
