# HV14 Energi – spot price contract

- Uses browser React Query requests through existing `/energy/api/v1/prices/today?area=NO2` and `/prices/tomorrow?area=NO2`. No backend or provider is added.
- Today's confirmed envelope is `{ price_area, date, period_count, prices }`; each period carries the supplied start/end, NOK/kWh, VAT flag, source and retrieved timestamp. Original ISO timestamps are retained unchanged.
- Current price is selected from today's confirmed periods using `start <= now < end`, not a fallback or invented value. `/prices/current` is not requested because its response envelope has not been verified. A strict single-record parser exists separately for future confirmed integration.
- Tomorrow's envelope is **unverified**: the handler currently accepts only a fully validated daily envelope matching the confirmed today contract. Different envelopes produce a visible format error rather than silent mapping. Real backend access is unavailable from this preview; provide actual tomorrow/current responses to confirm alternate envelopes.
- HTTP 404/204 or JSON null represents unavailable data. A valid empty list represents an empty result. Other HTTP failures and malformed responses are errors. Missing prices remain null/gaps; negative and zero prices are retained.
- NO2 display uses NOK × 100, and × 1.25 only when `includes_vat` is false. No backend prices are altered. Norgespris is a visual reference only, not billing or savings.
- Oslo date boundaries handle 23/25-hour DST days. Chart gaps are inserted for absent hourly intervals; supplied periods are not forced into 24 buckets. Offset labels distinguish repeated hours. Average is duration-weighted over available periods.
- History is not requested: this task displays today/tomorrow only. Any future history integration must validate its separate envelope and send timezone-qualified ISO start/end with a limit no higher than 10000.
- No HV14-server deployment has been performed.