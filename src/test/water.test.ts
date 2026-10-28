import { describe, expect, it } from "vitest";
import { computeConsumption } from "@/lib/water/consumption";
import { freshnessOf } from "@/lib/water/freshness";
import { formatDateTime, formatM3 } from "@/lib/water/format";
import { addOsloDays, osloMidnight } from "@/lib/water/time";
import type { Reading } from "@/lib/water/types";

const r = (iso: string, v: number | null): Reading => ({
  measuredAt: new Date(iso),
  receivedAt: null,
  valueM3: v,
  type: null,
});

describe("formatting", () => {
  it("formats meter reading in Norwegian", () => {
    expect(formatM3(708.027)).toBe("708,027 m³");
  });
  it("formats timestamps in Europe/Oslo with DST", () => {
    expect(formatDateTime(new Date("2026-10-26T08:16:00Z"))).toBe("26.10.2026 kl. 09:16");
    expect(formatDateTime(new Date("2026-07-01T07:16:00Z"))).toBe("01.07.2026 kl. 09:16");
  });
});

describe("consumption", () => {
  const from = new Date("2026-10-26T00:00:00Z");
  const to = new Date("2026-10-26T04:00:00Z");

  it("treats hours without readings as missing, never zero", () => {
    const b = computeConsumption(
      [r("2026-10-25T23:30:00Z", 10), r("2026-10-26T00:30:00Z", 10.01), r("2026-10-26T03:30:00Z", 10.05)],
      from, to, "hour",
    );
    expect(b.map((x) => x.status)).toEqual(["ok", "missing", "missing", "missing"]);
    expect(b[0]?.valueM3).toBeCloseTo(0.01);
    expect(b[1]?.valueM3).toBeNull();
  });

  it("shows confirmed zero consumption as zero", () => {
    const b = computeConsumption([r("2026-10-25T23:00:00Z", 5), r("2026-10-26T00:00:00Z", 5)], from, new Date("2026-10-26T01:00:00Z"), "hour");
    expect(b[0]).toMatchObject({ status: "zero", valueM3: 0 });
  });

  it("marks a decreasing register as invalid", () => {
    const b = computeConsumption([r("2026-10-25T23:00:00Z", 5), r("2026-10-26T00:00:00Z", 4)], from, new Date("2026-10-26T01:00:00Z"), "hour");
    expect(b[0]?.status).toBe("invalid");
  });

  it("daily buckets follow Oslo midnight across DST change", () => {
    const d = osloMidnight(2026, 10, 25);
    expect(d.toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(addOsloDays(d, 1).toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });
});

describe("freshness", () => {
  const now = new Date("2026-10-26T12:00:00Z");
  it("is updated within threshold even with zero consumption", () => {
    expect(freshnessOf(r("2026-10-26T06:00:00Z", 1), 8, now)).toBe("updated");
  });
  it("is delayed past threshold", () => {
    expect(freshnessOf(r("2026-10-26T03:00:00Z", 1), 8, now)).toBe("delayed");
  });
  it("is unavailable with no reading", () => {
    expect(freshnessOf(null, 8, now)).toBe("unavailable");
  });
});
