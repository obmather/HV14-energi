import { queryOptions } from "@tanstack/react-query";
import { ENERGY_API_V1 } from "./easee-client";
import { addOsloDays } from "@/lib/water/time";

// Endpoint envelopes are NOT yet confirmed against the backend (only available in an
// isolated dev environment). Parsers validate the assumed shape documented in
// docs/energy-norgespris-contract.md and fail visibly otherwise. No values are computed here.
export const NORGESPRIS_DEVICE = "aidon_main";
export const NORGESPRIS_AREA = "NO2";
export type NorgesprisStatus = "complete" | "incomplete";
export interface NorgesprisAgreement { fixedPriceNokKwhExVat: number | null; monthlyCapKwh: number | null; validFrom: string | null; validTo: string | null }
export interface NorgesprisSummary { status: NorgesprisStatus; verifiedHours: number | null; expectedHours: number | null; adjustmentNokExVat: number | null; agreement: NorgesprisAgreement }
export interface NorgesprisHour { startIso: string; endIso: string; consumptionKwh: number | null; spotNokKwhExVat: number | null; adjustmentNokExVat: number | null; status: string }
export interface NorgesprisMonth { status: NorgesprisStatus; hours: NorgesprisHour[] }
export class NorgesprisResponseError extends Error {}

const obj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new NorgesprisResponseError("Ugyldig tallverdi fra API-et.");
  return v;
};
const str = (v: unknown): string | null => (v === null || v === undefined ? null : typeof v === "string" ? v : (() => { throw new NorgesprisResponseError("Ugyldig tekstverdi fra API-et."); })());
const status = (v: unknown): NorgesprisStatus => {
  if (v === "complete" || v === "incomplete") return v;
  throw new NorgesprisResponseError("Ukjent datastatus fra API-et.");
};

export function parseSummary(v: unknown): NorgesprisSummary {
  if (!obj(v) || !obj(v["agreement"])) throw new NorgesprisResponseError("Ukjent Norgespris-format fra API-et.");
  const a = v["agreement"];
  return {
    status: status(v["status"]), verifiedHours: num(v["verified_hours"]), expectedHours: num(v["expected_hours"]),
    adjustmentNokExVat: num(v["adjustment_nok_ex_vat"]),
    agreement: { fixedPriceNokKwhExVat: num(a["fixed_price_nok_kwh_ex_vat"]), monthlyCapKwh: num(a["monthly_cap_kwh"]), validFrom: str(a["valid_from"]), validTo: str(a["valid_to"]) },
  };
}
export function parseMonth(v: unknown): NorgesprisMonth {
  if (!obj(v) || !Array.isArray(v["hours"])) throw new NorgesprisResponseError("Ukjent timeformat fra API-et.");
  return { status: status(v["status"]), hours: v["hours"].map((h) => {
    if (!obj(h) || typeof h["period_start"] !== "string" || typeof h["period_end"] !== "string" || typeof h["status"] !== "string") throw new NorgesprisResponseError("Ugyldig time i svaret.");
    return { startIso: h["period_start"], endIso: h["period_end"], consumptionKwh: num(h["consumption_kwh"]), spotNokKwhExVat: num(h["spot_price_nok_kwh_ex_vat"]), adjustmentNokExVat: num(h["adjustment_nok_ex_vat"]), status: h["status"] };
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
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
export const norgesprisSummaryQuery = (month: string) => queryOptions({
  queryKey: ["hv14", "energi", "norgespris", "summary", month],
  queryFn: async () => { const v = await get("summary", month); return v === null ? null : parseSummary(v); }, retry: 1,
});
export const norgesprisMonthQuery = (month: string) => queryOptions({
  queryKey: ["hv14", "energi", "norgespris", "month", month],
  queryFn: async () => { const v = await get("month", month); return v === null ? null : parseMonth(v); }, retry: 1,
});
