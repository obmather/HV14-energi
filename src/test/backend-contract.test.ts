import { describe, expect, it } from "vitest";
import { joinMeters, normalizeDaily, normalizeMeasurementPoint, normalizeMeter, normalizeReading } from "@/lib/water/api-client";
import { computeConsumption, dailyBucketsFromBackend } from "@/lib/water/consumption";
import { osloMidnight, addOsloDays } from "@/lib/water/time";

describe("backend contract mapping", () => {
  it("maps latest reading fields", () => {
    const r = normalizeReading({ meter_id: 1, reading_at: "2026-10-26T20:16:22+00:00", reading_kind: "instant", volume_l: 708125, volume_m3: 708.125 });
    expect(r?.valueM3).toBe(708.125);
    expect(r?.type).toBe("instant");
    expect(r?.measuredAt.toISOString()).toBe("2026-10-26T20:16:22.000Z");
  });

  it("keeps null interval consumption as null, not zero", () => {
    expect(normalizeReading({ reading_at: "2026-10-26T20:16:22Z", volume_m3: 1, interval_consumption_l: null })?.intervalConsumptionL).toBeNull();
    expect(normalizeReading({ reading_at: "2026-10-26T20:00:00Z", volume_m3: 1, interval_consumption_l: 14 })?.intervalConsumptionL).toBe(14);
  });

  it("names meters from measurement points", () => {
    const m = normalizeMeter({ meter_id: 2, serial_number: "05877989" });
    const p = normalizeMeasurementPoint({ channel_id: 2, channel_name: "MP 2 – Bryggeri/Garasje", meter_id: 2, included_in_site_total: true })!;
    const [j] = joinMeters([m], [p]);
    expect(j).toMatchObject({ id: "2", channelId: "2", name: "MP 2 – Bryggeri/Garasje", serialNumber: "05877989" });
  });

  it("does not double-count instant and hourly readings at the same hour", () => {
    const readings = [
      { reading_at: "2026-10-26T20:16:22+00:00", reading_kind: "instant", volume_m3: 708.125 },
      { reading_at: "2026-10-26T20:00:00+00:00", reading_kind: "hourly", volume_m3: 708.124 },
      { reading_at: "2026-10-26T19:00:00+00:00", reading_kind: "hourly", volume_m3: 708.11 },
    ].map(normalizeReading).filter((r) => r !== null);
    const b = computeConsumption(readings, new Date("2026-10-26T20:00:00Z"), new Date("2026-10-26T21:00:00Z"), "hour");
    expect(b[0]?.valueM3).toBeCloseTo(0.015);
  });
});

describe("backend daily consumption", () => {
  const from = osloMidnight(2026, 10, 24);
  const to = addOsloDays(osloMidnight(2026, 10, 26), 1);

  it("keeps a recorded zero as zero and preserves partial quality", () => {
    const rows = [normalizeDaily({ period_start: "2026-10-25", consumption_l: 0, quality_status: "partial" })!];
    const b = dailyBucketsFromBackend(rows, from, to);
    expect(b[1]).toMatchObject({ status: "zero", valueM3: 0, quality: "partial" });
  });

  it("treats days the backend did not return as missing, not zero", () => {
    const rows = [normalizeDaily({ period_start: "2026-10-25", consumption_l: 680, quality_status: "complete" })!];
    const b = dailyBucketsFromBackend(rows, from, to);
    expect(b.map((x) => x.status)).toEqual(["missing", "ok", "missing"]);
    expect(b[0]?.valueM3).toBeNull();
    expect(b[1]).toMatchObject({ valueM3: 0.68, quality: "complete" });
  });
});
