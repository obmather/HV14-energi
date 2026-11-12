import { describe, expect, it } from "vitest";
import { hourLabel, parseHourlyConsumption } from "@/lib/energy/aidon-client";

const d = parseHourlyConsumption({
  hours: [
    { hour_start: "2026-10-25T00:00:00Z", hour_local: "2026-10-25T02:00:00+02:00", consumption_kwh: 1.2, status: "valid" },
    { hour_start: "2026-10-25T01:00:00Z", hour_local: "2026-10-25T02:00:00+01:00", consumption_kwh: null, status: "missing" },
  ],
  expected_hours: 25, valid_hours: 1, missing_hours: 24, total_consumption_kwh: 1.2, complete_period: false,
});

describe("Aidon hourly consumption", () => {
  it("keeps missing hours as null, not zero", () => expect(d.hours[1]!.kwh).toBeNull());
  it("labels hours from hour_local across DST change", () => expect(d.hours.map(hourLabel)).toEqual(["02:00", "02:00"]));
  it("flags incomplete periods", () => expect(d.completePeriod).toBe(false));
});
