import { describe, expect, it } from "vitest";
import { monthRange, parseSummary, NorgesprisResponseError } from "@/lib/energy/norgespris-client";
const base = { status: "incomplete", verified_hours: 10, expected_hours: 744, adjustment_nok_ex_vat: null, agreement: { fixed_price_nok_kwh_ex_vat: 0.4, monthly_cap_kwh: 5000, valid_from: "2025-10-01T00:00:00+02:00", valid_to: null } };
describe("Norgespris client", () => {
  it("reads the monthly cap from the API and keeps null adjustment as null", () => {
    const s = parseSummary(base);
    expect(s.agreement.monthlyCapKwh).toBe(5000);
    expect(s.adjustmentNokExVat).toBeNull();
  });
  it("rejects unknown status", () => { expect(() => parseSummary({ ...base, status: "ok" })).toThrow(NorgesprisResponseError); });
  it("builds Oslo month bounds", () => {
    expect(monthRange("2026-01")).toEqual({ start_utc: "2025-12-31T23:00:00.000Z", end_utc: "2026-01-31T23:00:00.000Z" });
  });
});
