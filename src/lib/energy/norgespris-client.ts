import { queryOptions } from "@tanstack/react-query";
import { ENERGY_API_V1 } from "./easee-client";
import { addOsloDays } from "@/lib/water/time";

// Endpoint envelopes are NOT yet confirmed against the backend (only available in an
// isolated dev environment). Parsers validate the assumed shape documented in
// docs/energy-norgespris-contract.md and fail visibly otherwise. No values are computed here.
export const NORGESPRIS_DEVICE = "aidon_main";
export const NORGESPRIS_AREA = "NO2";
// Confirmed against real HV14 responses (only status=incomplete observed so far).
export type NorgesprisStatus = string; // "complete" is the only value that unlocks amounts
export interface NorgesprisAgreement { id: number; fixedPriceNokKwhExVat: number | null; monthlyCapKwh: number | null; validFrom: string | null; validTo: string | null; priceArea: string }
export interface NorgesprisSummary { status: NorgesprisStatus; totalHours: number | null; verifiedHours: number | null; hourStatuses: Record<string, number>; eligibleKwh: number | null; adjustmentNokExVat: number | null; agreement: NorgesprisAgreement | null }
export interface NorgesprisHour { startIso: string; eligibleKwh: number | null; adjustmentNokExVat: number | null; status: string }
export interface NorgesprisMonth { agreement: NorgesprisAgreement | null; hours: NorgesprisHour[] }
export class NorgesprisResponseError extends Error {}
export class NorgesprisHttpError extends Error { constructor(public status: number) { super(`HTTP ${status}`); } }
export function norgesprisErrorMessage(e: unknown): string {
  if (e instanceof NorgesprisResponseError) return "Norgespris-data har et ukjent eller ugyldig format.";
  if (e instanceof NorgesprisHttpError) {
    if (e.status === 403) return "Ingen tilgang til Norgespris-data (HTTP 403).";
    if (e.status === 422) return "API-et avviste forespørselen for valgt måned (HTTP 422).";
    if (e.status >= 500) return `Feil i Norgespris-tjenesten (HTTP ${e.status}). Prøv igjen senere.`;
    return `Norgespris-tjenesten svarte med en feil (HTTP ${e.status}).`;
  }
  return "Kunne ikke kontakte Norgespris-tjenesten.";
}

const obj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const bad = (m: string): never => { throw new NorgesprisResponseError(m); };
// Backend sends decimals as strings ("0.400000"); null stays null, never 0.
const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return bad("Ugyldig tallverdi fra API-et.");
};
const str = (v: unknown): string | null => (v === null || v === undefined ? null : typeof v === "string" ? v : bad("Ugyldig tekstverdi fra API-et."));
const envelope = (v: unknown): Record<string, unknown> => {
  if (!obj(v) || v["device_id"] !== NORGESPRIS_DEVICE || v["price_area"] !== NORGESPRIS_AREA) bad("Ukjent Norgespris-format fra API-et.");
  return v as Record<string, unknown>;
};
function agreement(a: unknown): NorgesprisAgreement | null {
  if (a === null || a === undefined) return null;
  if (!obj(a) || typeof a["id"] !== "number" || typeof a["price_area"] !== "string") return bad("Ukjent avtaleformat fra API-et.");
  return { id: a["id"], fixedPriceNokKwhExVat: num(a["fixed_price_nok_kwh"]), monthlyCapKwh: num(a["monthly_limit_kwh"]),
    validFrom: str(a["valid_from"]), validTo: str(a["valid_to"]), priceArea: a["price_area"] };
}

export function parseSummary(raw: unknown): NorgesprisSummary {
  const v = envelope(raw);
  if (typeof v["status"] !== "string") bad("Ukjent datastatus fra API-et.");
  const hs = v["hour_statuses"] ?? {};
  if (!obj(hs) || Object.values(hs).some((n) => typeof n !== "number")) bad("Ugyldige timestatuser fra API-et.");
  return { status: v["status"] as string, totalHours: num(v["total_hours"]), verifiedHours: num(v["verified_hours"]),
    hourStatuses: hs as Record<string, number>, eligibleKwh: num(v["eligible_kwh"]), adjustmentNokExVat: num(v["adjustment_nok_ex_vat"]),
    agreement: agreement(v["agreement"]) };
}
export function parseMonth(raw: unknown): NorgesprisMonth {
  const v = envelope(raw);
  if (!Array.isArray(v["hours"])) bad("Ukjent timeformat fra API-et.");
  return { agreement: agreement(v["agreement"]), hours: (v["hours"] as unknown[]).map((h) => {
    if (!obj(h) || typeof h["hour_start"] !== "string" || !Number.isFinite(Date.parse(h["hour_start"])) || typeof h["status"] !== "string") return bad("Ugyldig time i svaret.");
    return { startIso: h["hour_start"], eligibleKwh: num(h["eligible_kwh"]), adjustmentNokExVat: num(h["adjustment_nok_ex_vat"]), status: h["status"] };
  }) };
}

/** Oslo calendar month [start, end) for "YYYY-MM", as timezone-qualified UTC ISO strings. */
export function monthRange(month: string) {
  const [y = 1970, m = 1] = month.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, 1, 12));
  const offset = new Intl.DateTimeFormat("en", { timeZone: "Europe/Oslo", timeZoneName: "shortOffset" }).formatToParts(probe).find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const hours = Number(offset.replace("GMT", "") || 0);
  const start = new Date(Date.UTC(y, m - 1, 1) - hours * 3600_000);
  let end = start; const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  end = addOsloDays(start, days);
  return { start_utc: start.toISOString(), end_utc: end.toISOString() };
}

async function get(path: "summary" | "month", month: string, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  const { start_utc, end_utc } = monthRange(month);
  const qs = new URLSearchParams({ start_utc, end_utc, device_id: NORGESPRIS_DEVICE, price_area: NORGESPRIS_AREA });
  const res = await fetchImpl(`${ENERGY_API_V1}/norgespris/${path}?${qs}`, { headers: { Accept: "application/json" } });
  if (res.status === 404 || res.status === 204) return null;
  if (!res.ok) throw new NorgesprisHttpError(res.status);
  return res.json();
}
export const norgesprisSummaryQuery = (month: string) => queryOptions({
  queryKey: ["hv14", "energi", "norgespris", "summary", month],
  queryFn: async () => { const v = await get("summary", month); return v === null ? null : parseSummary(v); }, retry: (n, e) => !(e instanceof NorgesprisHttpError && e.status < 500) && n < 1,
});
export const norgesprisMonthQuery = (month: string) => queryOptions({
  queryKey: ["hv14", "energi", "norgespris", "month", month],
  queryFn: async () => { const v = await get("month", month); return v === null ? null : parseMonth(v); }, retry: (n, e) => !(e instanceof NorgesprisHttpError && e.status < 500) && n < 1,
});

/** Provisional totals summed only from hours the API actually calculated; missing hours are counted, never estimated. */
export function provisionalTotals(hours: NorgesprisHour[]) {
  let adjustmentNokExVat = 0, kwh = 0, calculatedHours = 0, hasKwh = false;
  for (const h of hours) {
    if (h.eligibleKwh != null) { kwh += h.eligibleKwh; hasKwh = true; }
    if (h.adjustmentNokExVat != null) { adjustmentNokExVat += h.adjustmentNokExVat; calculatedHours++; }
  }
  return { adjustmentNokExVat: calculatedHours ? adjustmentNokExVat : null, kwh: hasKwh ? kwh : null, calculatedHours, missingHours: hours.length - calculatedHours };
}

const HOUR_STATUS: Record<string, string> = { complete: "Komplett", verified: "Verifisert", incomplete: "Datagrunnlag ufullstendig", missing: "Mangler data",
  missing_consumption: "Mangler forbruksdata", missing_spot_price: "Mangler spotpris", outside_agreement: "Utenfor avtaleperioden" };
export function hourStatusLabel(status: string, hasAmount: boolean): string {
  if (status === "incomplete_month_history") return hasAmount ? "Foreløpig beregnet" : "Mangler månedshistorikk";
  return HOUR_STATUS[status] ?? status;
}
