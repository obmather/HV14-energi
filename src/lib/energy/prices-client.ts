import { queryOptions } from "@tanstack/react-query";
import { ENERGY_API_V1 } from "./easee-client";
import { addOsloDays, startOfOsloDay } from "@/lib/water/time";
import { formatTime } from "@/lib/water/format";

export const PRICE_AREA = "NO2";
export const NORGESPRIS_ORE = 50;
export interface SpotPrice {
  area: string;
  startIso: string;
  endIso: string;
  nokKwh: number | null;
  includesVat: boolean;
  source: string;
  retrievedIso: string;
}
export interface DailyPrices { area: string; date: string; count: number; prices: SpotPrice[] }
export class PriceResponseError extends Error {}
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const iso = (v: unknown): v is string => typeof v === "string" && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v));

export function parseSpotPrice(v: unknown): SpotPrice {
  if (!object(v) || v.price_area !== PRICE_AREA || !iso(v.period_start) || !iso(v.period_end)
    || Date.parse(v.period_end) <= Date.parse(v.period_start) || typeof v.includes_vat !== "boolean"
    || typeof v.source !== "string" || !iso(v.retrieved_at)
    || !(v.price_nok_kwh === null || (typeof v.price_nok_kwh === "number" && Number.isFinite(v.price_nok_kwh)))) {
    throw new PriceResponseError("Ukjent prisformat fra API-et.");
  }
  return { area: v.price_area, startIso: v.period_start, endIso: v.period_end, nokKwh: v.price_nok_kwh,
    includesVat: v.includes_vat, source: v.source, retrievedIso: v.retrieved_at };
}

export function parseTodayPrices(v: unknown): DailyPrices {
  if (!object(v) || v.price_area !== PRICE_AREA || typeof v.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)
    || !Number.isInteger(v.period_count) || !Array.isArray(v.prices) || v.period_count !== v.prices.length) {
    throw new PriceResponseError("Ukjent dagsprisformat fra API-et.");
  }
  const prices = v.prices.map(parseSpotPrice).sort((a, b) => Date.parse(a.startIso) - Date.parse(b.startIso));
  return { area: v.price_area, date: v.date, count: prices.length, prices };
}

// Only today's envelope is confirmed. Other handlers deliberately validate
// their own accepted shape; unknown envelopes fail visibly, never invent data.
export function parseTomorrowPrices(v: unknown): DailyPrices { return parseTodayPrices(v); }
export function parseCurrentPrice(v: unknown): SpotPrice | null {
  if (v === null) return null;
  return parseSpotPrice(v);
}

export function priceOre(p: SpotPrice): number | null {
  return p.nokKwh === null ? null : p.nokKwh * (p.includesVat ? 1 : 1.25) * 100;
}
export function isCurrentPrice(p: SpotPrice, now: Date): boolean {
  return Date.parse(p.startIso) <= now.getTime() && now.getTime() < Date.parse(p.endIso);
}
export function priceHourLabel(p: SpotPrice): string { return formatTime(new Date(p.startIso)); }
export function priceIntervalLabel(p: SpotPrice): string {
  const label = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit", timeZoneName: "shortOffset" });
  return `${label.format(new Date(p.startIso))} – ${label.format(new Date(p.endIso))}`;
}
export function priceDayRange(day: "today" | "tomorrow", now = new Date()) {
  const start = addOsloDays(startOfOsloDay(now), day === "tomorrow" ? 1 : 0);
  return { start, end: addOsloDays(start, 1) };
}
export function priceChartRows(data: DailyPrices) {
  const { start, end } = priceDayRange("today", new Date(`${data.date}T12:00:00+01:00`));
  const rows: { startIso: string; price: SpotPrice | null; ore: number | null }[] = [];
  // Include absent intervals as gaps, including 23/25-hour Oslo days.
  let t = start.getTime();
  while (t < end.getTime()) {
    const price = data.prices.find((p) => Date.parse(p.startIso) <= t && Date.parse(p.endIso) > t) ?? null;
    rows.push({ startIso: price?.startIso ?? new Date(t).toISOString(), price, ore: price ? priceOre(price) : null });
    t = price ? Math.min(Date.parse(price.endIso), end.getTime()) : t + 3600_000;
  }
  return rows;
}
export function priceStats(prices: SpotPrice[]) {
  const valid = prices.flatMap((p) => { const ore = priceOre(p); return ore === null ? [] : [{ ore, ms: Date.parse(p.endIso) - Date.parse(p.startIso) }]; });
  if (!valid.length) return null;
  return { min: Math.min(...valid.map((p) => p.ore)), max: Math.max(...valid.map((p) => p.ore)),
    average: valid.reduce((sum, p) => sum + p.ore * p.ms, 0) / valid.reduce((sum, p) => sum + p.ms, 0) };
}
export async function fetchPrices(kind: "current" | "today" | "tomorrow", fetchImpl: typeof fetch = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetchImpl(`${ENERGY_API_V1}/prices/${kind}?area=${PRICE_AREA}`, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (res.status === 404 || res.status === 204) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as unknown;
  } finally { clearTimeout(timer); }
}
export const dailyPricesQuery = (day: "today" | "tomorrow", dateKey: string) => queryOptions({
  queryKey: ["hv14", "energi", "prices", day, PRICE_AREA, dateKey],
  queryFn: async () => { const v = await fetchPrices(day); return v === null ? null : day === "today" ? parseTodayPrices(v) : parseTomorrowPrices(v); },
  retry: 1, refetchInterval: 5 * 60_000,
});
export const currentPriceQuery = () => queryOptions({
  queryKey: ["hv14", "energi", "prices", "current", PRICE_AREA],
  queryFn: async () => parseCurrentPrice(await fetchPrices("current")), retry: 1, refetchInterval: 60_000,
});