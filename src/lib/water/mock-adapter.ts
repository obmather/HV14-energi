/**
 * DEVELOPMENT ONLY. Simulated data for when the private HV14 API is not
 * reachable (e.g. in the Lovable preview). Never used when an API base URL is
 * configured. The UI labels every view as simulated while this is active.
 */
import { METER_METADATA_FALLBACK } from "./config";
import type { DailyConsumption, DataSource, Meter, Reading } from "./types";
import { computeConsumption, osloDayKey } from "./consumption";
import { addOsloDays, startOfOsloDay } from "./time";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function hourlyProfile(hour: number): number {
  // liters per hour, typical household shape
  if (hour >= 6 && hour <= 8) return 45;
  if (hour >= 17 && hour <= 21) return 35;
  if (hour >= 0 && hour <= 4) return 0;
  return 10;
}

function buildReadings(meterId: string): Reading[] {
  const rnd = seeded(meterId === "1" ? 7 : 13);
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);
  const hours = 32 * 24;
  let value = meterId === "1" ? 100 : 20; // obviously fictitious register
  const out: Reading[] = [];
  for (let h = hours; h >= 0; h--) {
    const t = new Date(now.getTime() - h * 3600_000);
    const osloHour = (t.getUTCHours() + 1) % 24;
    let liters = 0;
    if (meterId === "1") liters = hourlyProfile(osloHour) * (0.4 + rnd() * 1.2);
    else liters = rnd() < 0.03 ? 20 + rnd() * 60 : 0; // mostly confirmed zero
    value += liters / 1000;
    // Simulated gap for MP 1 (3 – 2.5 days ago) to demonstrate missing data.
    if (meterId === "1" && h <= 72 && h > 60) continue;
    out.push({ measuredAt: t, receivedAt: null, valueM3: Math.round(value * 1000) / 1000, type: "simulert" });
  }
  return out;
}

const cache = new Map<string, Reading[]>();
const readingsFor = (id: string) => {
  if (!cache.has(id)) cache.set(id, buildReadings(id));
  return cache.get(id)!;
};

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 250));

export const mockSource: DataSource = {
  mode: "mock",
  async getMeters(): Promise<Meter[]> {
    return delay(
      Object.entries(METER_METADATA_FALLBACK).map(([id, m]) => ({
        id,
        name: m.name ?? `Måler ${id}`,
        location: m.location ?? null,
        serialNumber: m.serialNumber ?? null,
        manufacturer: m.manufacturer ?? null,
        model: m.model ?? null,
        devEui: m.devEui ?? null,
        channelId: id,
        installedAt: null,
        includedInSiteTotal: true,
      })),
    );
  },
  async getLatest(id) {
    const r = readingsFor(id);
    return delay(r[r.length - 1] ?? null);
  },
  async getReadings(id) {
    return delay(readingsFor(id));
  },
  async getDailyConsumption(channelId, limit) {
    const today = startOfOsloDay(new Date());
    const from = addOsloDays(today, -(limit - 1));
    const buckets = computeConsumption(readingsFor(channelId), from, addOsloDays(today, 1), "day");
    const rows: DailyConsumption[] = buckets
      .filter((b) => b.valueM3 != null)
      .map((b) => ({
        day: osloDayKey(b.start),
        consumptionL: Math.round(b.valueM3! * 1000),
        quality: b.start.getTime() === today.getTime() ? "partial" : "complete",
      }));
    return delay(rows);
  },
};
