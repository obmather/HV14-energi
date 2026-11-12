import { describe, expect, it } from "vitest";
import { monthRange, norgesprisErrorMessage, NorgesprisHttpError, parseMonth, parseSummary, NorgesprisResponseError } from "@/lib/energy/norgespris-client";
// Real HV14 responses (2026-11-12).
const agreement = { id: 1, valid_from: "2025-10-17", valid_to: "2026-12-31", fixed_price_nok_kwh: "0.400000", monthly_limit_kwh: "5000.000000", price_area: "NO2" };
const env = { device_id: "aidon_main", price_area: "NO2", start_utc: "2026-11-12T10:00:00+00:00", end_utc: "2026-11-12T11:00:00+00:00", agreement };
const summary = { ...env, status: "incomplete", total_hours: 1, verified_hours: 0, hour_statuses: { incomplete_month_history: 1 }, eligible_kwh: null, adjustment_nok_ex_vat: null };
const month = { ...env, hours: [{ hour_start: "2026-11-12T10:00:00+00:00", eligible_kwh: null, adjustment_nok_ex_vat: null, status: "incomplete_month_history" }] };
describe("Norgespris client", () => {
  it("parses the real summary; cap 5000 kWh from API, nulls stay null", () => {
    const s = parseSummary(summary);
    expect(s.agreement?.monthlyCapKwh).toBe(5000);
    expect(s.agreement?.fixedPriceNokKwhExVat).toBe(0.4);
    expect(s.totalHours).toBe(1);
    expect(s.verifiedHours).toBe(0);
    expect(s.adjustmentNokExVat).toBeNull();
    expect(s.eligibleKwh).toBeNull();
  });
  it("parses the real month response", () => {
    const m = parseMonth(month);
    expect(m.hours[0]).toEqual({ startIso: "2026-11-12T10:00:00+00:00", eligibleKwh: null, adjustmentNokExVat: null, status: "incomplete_month_history" });
  });
  it("rejects another device", () => { expect(() => parseSummary({ ...summary, device_id: "x" })).toThrow(NorgesprisResponseError); });
  it("builds Oslo month bounds across DST", () => {
    expect(monthRange("2026-01")).toEqual({ start_utc: "2025-12-31T23:00:00.000Z", end_utc: "2026-01-31T23:00:00.000Z" });
    expect(monthRange("2026-03")).toEqual({ start_utc: "2026-02-28T23:00:00.000Z", end_utc: "2026-03-31T22:00:00.000Z" });
    expect(monthRange("2026-10")).toEqual({ start_utc: "2026-09-30T22:00:00.000Z", end_utc: "2026-10-31T23:00:00.000Z" });
  });
  it("explains 403, 422 and 5xx", () => {
    expect(norgesprisErrorMessage(new NorgesprisHttpError(403))).toContain("403");
    expect(norgesprisErrorMessage(new NorgesprisHttpError(422))).toContain("422");
    expect(norgesprisErrorMessage(new NorgesprisHttpError(503))).toContain("503");
  });
});
import { provisionalTotals, hourStatusLabel } from "@/lib/energy/norgespris-client";
describe("Norgespris provisional totals", () => {
  const h = (kwh: string | null, adj: string | null, status = "incomplete_month_history") => ({ hour_start: "2026-11-12T10:00:00+00:00", eligible_kwh: kwh, adjustment_nok_ex_vat: adj, status });
  it("sums only calculated hours and counts missing ones", () => {
    const m = parseMonth({ ...env, hours: [h("2.220000", "3.406035000000"), h("1.5", "-1.0"), h(null, null, "missing_consumption")] });
    const t = provisionalTotals(m.hours);
    expect(t.adjustmentNokExVat).toBeCloseTo(2.406035);
    expect(t.kwh).toBeCloseTo(3.72);
    expect(t.calculatedHours).toBe(2);
    expect(t.missingHours).toBe(1);
  });
  it("keeps totals null when nothing is calculated", () => {
    expect(provisionalTotals(parseMonth(month).hours).adjustmentNokExVat).toBeNull();
  });
  it("labels statuses in Norwegian", () => {
    expect(hourStatusLabel("incomplete_month_history", true)).toBe("Foreløpig beregnet");
    expect(hourStatusLabel("incomplete_month_history", false)).toBe("Mangler månedshistorikk");
    expect(hourStatusLabel("missing_spot_price", false)).toBe("Mangler spotpris");
    expect(hourStatusLabel("outside_agreement", false)).toBe("Utenfor avtaleperioden");
  });
});
