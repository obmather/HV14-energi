/**
 * HV14 Energi – Aidon main meter (device_id "aidon_main"): hourly consumption
 * from GET /energy/api/v1/consumption/hourly. Real data only. Missing hours stay
 * null (gaps), never 0. Spot cost is NOK excl. VAT, without grid tariff or fees.
 */
import { queryOptions } from "@tanstack/react-query";
import { addOsloDays, startOfOsloDay, zonedParts, osloMidnight } from "@/lib/water/time";
import { buildChargers, getJson, parseDeviceStates, parseMeasurements } from "./easee-client";

export const AIDON_DEVICE_ID = "aidon_main";

export interface ConsumptionHour {
  start: Date;
  end: Date | null;
  local: string | null;
  kwh: number | null;
  spotPriceNokKwh: number | null;
  spotCostNok: number | null;
  status: string | null;
}

export interface HourlyConsumption {
  hours: ConsumptionHour[];
  expectedHours: number | null;
  validHours: number | null;
  pricedHours: number | null;
  missingHours: number | null;
  totalKwh: number | null;
  totalSpotCostNok: number | null;
  completePeriod: boolean;
  completeCostPeriod: boolean;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (v == null || v === "" ? null : String(v));
const date = (v: unknown) => {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function parseHourlyConsumption(data: unknown): HourlyConsumption {
  if (!isObj(data) || !Array.isArray(data["hours"])) throw new Error("Ugyldig svar");
  const hours = data["hours"].filter(isObj).flatMap((h) => {
    const start = date(h["hour_start"]);
    if (!start) return [];
    const status = str(h["status"]);
    const kwh = num(h["consumption_kwh"]);
    return [{
      start,
      end: date(h["hour_end"]),
      local: str(h["hour_local"]),
      kwh: status === "missing" ? null : kwh,
      spotPriceNokKwh: num(h["spot_price_nok_kwh"]),
      spotCostNok: num(h["spot_cost_nok_ex_vat"]),
      status,
    }];
  });
  return {
    hours,
    expectedHours: num(data["expected_hours"]),
    validHours: num(data["valid_hours"]),
    pricedHours: num(data["priced_hours"]),
    missingHours: num(data["missing_hours"]),
    totalKwh: num(data["total_consumption_kwh"]),
    totalSpotCostNok: num(data["total_spot_cost_nok_ex_vat"]),
    completePeriod: data["complete_period"] === true,
    completeCostPeriod: data["complete_cost_period"] === true,
  };
}

/** "HH:mm" from hour_local (already Oslo time incl. DST); falls back to Oslo formatting. */
export function hourLabel(h: ConsumptionHour): string {
  const m = h.local?.match(/T?(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  const p = zonedParts(h.start);
  return `${String(p.hour).padStart(2, "0")}:00`;
}

export type EnergyPeriod = "today" | "yesterday" | "7d" | "month";
export const PERIOD_LABELS: Record<Exclude<EnergyPeriod, "month">, string> = { today: "I dag", yesterday: "I går", "7d": "Siste 7 dager" };

export function periodRange(p: EnergyPeriod, now = new Date()): { start: Date; end: Date } {
  const today = startOfOsloDay(now);
  if (p === "yesterday") return { start: addOsloDays(today, -1), end: today };
  if (p === "7d") return { start: addOsloDays(today, -6), end: addOsloDays(today, 1) };
  if (p === "month") {
    const z = zonedParts(now);
    return { start: osloMidnight(z.year, z.month, 1), end: addOsloDays(today, 1) };
  }
  return { start: today, end: addOsloDays(today, 1) };
}

export const hourlyConsumptionQuery = (p: EnergyPeriod) => {
  const { start, end } = periodRange(p);
  return queryOptions({
    queryKey: ["hv14", "energi", "aidon", "hourly", p, start.toISOString()],
    queryFn: async () => {
      const q = new URLSearchParams({ device_id: AIDON_DEVICE_ID, start: start.toISOString(), end: end.toISOString() });
      return parseHourlyConsumption(await getJson(`/consumption/hourly?${q}`));
    },
    refetchInterval: 5 * 60_000,
    retry: 1,
  });
};

/** Latest real-time power and register for the main meter, matched by device_id. */
export const mainMeterLatestQuery = () =>
  queryOptions({
    queryKey: ["hv14", "energi", "aidon", "latest"],
    queryFn: async () => {
      const [d, m] = await Promise.all([getJson("/devices/states"), getJson("/measurements/latest")]);
      const devices = parseDeviceStates(d);
      if (!devices.some((x) => x.deviceId === AIDON_DEVICE_ID)) devices.push({ deviceId: AIDON_DEVICE_ID, name: "Hovedmåler", state: null, reportedAt: null, receivedAt: null });
      return buildChargers(devices, parseMeasurements(m)).find((x) => x.deviceId === AIDON_DEVICE_ID)!;
    },
    refetchInterval: 30_000,
    retry: 1,
  });

export const formatNok = (v: number) =>
  `${new Intl.NumberFormat("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} kr ekskl. mva.`;
