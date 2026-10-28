import type { ConsumptionBucket, DailyConsumption, Granularity, Reading } from "./types";
import { addOsloDays, startOfHour, startOfOsloDay, zonedParts } from "./time";

/** Bucket boundaries covering [from, to) in Europe/Oslo. */
export function bucketBoundaries(from: Date, to: Date, g: Granularity): Date[] {
  const out: Date[] = [];
  if (g === "hour") {
    let t = startOfHour(from).getTime();
    while (t < to.getTime()) {
      out.push(new Date(t));
      t += 3600_000;
    }
  } else {
    let d = startOfOsloDay(from);
    while (d.getTime() < to.getTime()) {
      out.push(d);
      d = addOsloDays(d, 1);
    }
  }
  return out;
}

/**
 * Derive consumption per bucket from cumulative register readings.
 *
 * consumption(bucket) = last reading in bucket − last reading in the
 * immediately preceding bucket. If either side lacks a reading the bucket is
 * "missing" (never 0). A decreasing register makes the bucket "invalid".
 * No interpolation is performed.
 */
export function computeConsumption(
  readings: Reading[],
  from: Date,
  to: Date,
  g: Granularity,
): ConsumptionBucket[] {
  const valid = readings
    .filter((r) => r.valueM3 != null && Number.isFinite(r.valueM3))
    .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());

  const starts = bucketBoundaries(from, to, g);
  if (starts.length === 0) return [];
  const step = (d: Date) =>
    g === "hour" ? new Date(d.getTime() + 3600_000) : addOsloDays(d, 1);
  const prevStart =
    g === "hour" ? new Date(starts[0]!.getTime() - 3600_000) : addOsloDays(starts[0]!, -1);

  // Last reading per bucket, including one extra bucket before the range.
  const allStarts = [prevStart, ...starts];
  const lastIn: (number | null)[] = allStarts.map(() => null);
  let i = 0;
  for (let b = 0; b < allStarts.length; b++) {
    const bs = allStarts[b]!;
    const s = bs.getTime();
    const e = step(bs).getTime();
    while (i < valid.length && valid[i]!.measuredAt.getTime() < s) i++;
    let j = i;
    while (j < valid.length && valid[j]!.measuredAt.getTime() < e) {
      lastIn[b] = valid[j]!.valueM3;
      j++;
    }
    i = j;
  }

  return starts.map((start, k) => {
    const end = step(start);
    const prev = lastIn[k] ?? null;
    const cur = lastIn[k + 1] ?? null;
    if (prev == null || cur == null) {
      return { start, end, valueM3: null, status: "missing" as const };
    }
    const diff = Math.round((cur - prev) * 1e6) / 1e6;
    if (diff < 0) return { start, end, valueM3: null, status: "invalid" as const };
    return { start, end, valueM3: diff, status: diff === 0 ? ("zero" as const) : ("ok" as const) };
  });
}

export function summarize(buckets: ConsumptionBucket[]) {
  let total = 0;
  let measured = 0;
  let missing = 0;
  let invalid = 0;
  for (const b of buckets) {
    if (b.valueM3 != null) {
      total += b.valueM3;
      measured++;
    } else if (b.status === "invalid") invalid++;
    else missing++;
  }
  return { total, measured, missing, invalid };
}

/** Oslo calendar day key (YYYY-MM-DD) for a day-start instant. */
export function osloDayKey(d: Date): string {
  const z = zonedParts(d);
  return `${z.year}-${String(z.month).padStart(2, "0")}-${String(z.day).padStart(2, "0")}`;
}

/**
 * Map backend daily consumption onto Oslo-day buckets covering [from, to).
 * Days the backend did not return are "missing" (never 0). A recorded 0 stays 0.
 * quality_status is passed through unchanged.
 */
export function dailyBucketsFromBackend(rows: DailyConsumption[], from: Date, to: Date): ConsumptionBucket[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  return bucketBoundaries(from, to, "day").map((start) => {
    const end = addOsloDays(start, 1);
    const row = byDay.get(osloDayKey(start));
    if (!row || row.consumptionL == null) return { start, end, valueM3: null, status: "missing" as const, quality: row?.quality ?? null };
    const valueM3 = row.consumptionL / 1000;
    return { start, end, valueM3, status: valueM3 === 0 ? ("zero" as const) : ("ok" as const), quality: row.quality };
  });
}

/** Number of daily periods to request so that `from` is covered (backend returns latest N). */
export function dailyLimitFor(from: Date, now = new Date()): number {
  const days = Math.ceil((now.getTime() - from.getTime()) / 86_400_000) + 2;
  return Math.min(Math.max(days, 1), 400);
}
