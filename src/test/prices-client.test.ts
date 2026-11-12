import { describe, expect, it } from "vitest";
import { fetchPrices, isCurrentPrice, NORGESPRIS_ORE, parseCurrentPrice, parseTodayPrices, parseTomorrowPrices, priceChartRows, priceDayRange, priceHourLabel, priceIntervalLabel, priceOre, priceStats } from "@/lib/energy/prices-client";

const record = (changes = {}) => ({ price_area: "NO2", period_start: "2026-11-11T23:00:00+00:00", period_end: "2026-11-12T00:00:00+00:00", price_nok_kwh: 1.99433, original_price_nok_kwh: 1.99433, includes_vat: false, source: "hvakosterstrommen.no", retrieved_at: "2026-11-12T08:28:32.773021+00:00", ...changes });
const daily = (prices = [record()], date = "2026-11-12") => ({ price_area: "NO2", date, period_count: prices.length, prices });

describe("Energi spot prices", () => {
  it("parses the confirmed daily response without changing ISO timestamps", () => {
    const d = parseTodayPrices(daily());
    expect(d.prices[0]?.startIso).toBe("2026-11-11T23:00:00+00:00");
    expect(d.prices[0]?.nokKwh).toBe(1.99433);
  });
  it("adds 25 percent VAT to NO2 prices excluding VAT", () => {
    const p = parseCurrentPrice(record());
    expect(p && priceOre(p)).toBeCloseTo(249.29125);
  });
  it("does not double-add VAT to VAT-inclusive prices", () => {
    const p = parseCurrentPrice(record({ includes_vat: true }));
    expect(p && priceOre(p)).toBeCloseTo(199.433);
  });
  it("uses Norgespris at 50 ore including VAT", () => expect(NORGESPRIS_ORE).toBe(50));
  it("does not replace missing prices with zero", () => {
    const d = parseTodayPrices(daily([record({ price_nok_kwh: null })]));
    expect(d.prices[0] && priceOre(d.prices[0])).toBeNull();
    expect(priceStats(d.prices)).toBeNull();
    expect(priceChartRows(d).every((r) => r.ore === null)).toBe(true);
  });
  it("retains real zero and negative prices", () => {
    const d = parseTodayPrices(daily([record({ price_nok_kwh: 0 }), record({ price_nok_kwh: -1, period_start: "2026-11-12T00:00:00Z", period_end: "2026-11-12T01:00:00Z" })]));
    expect(d.prices.map(priceOre)).toEqual([0, -125]);
    expect(priceStats(d.prices)).toEqual({ min: -125, max: 0, average: -62.5 });
  });
  it("distinguishes unavailable current data from empty daily data", () => {
    expect(parseCurrentPrice(null)).toBeNull();
    expect(parseTodayPrices(daily([])).prices).toEqual([]);
  });
  it("rejects unconfirmed current and tomorrow envelopes", () => {
    expect(() => parseCurrentPrice({ price: record() })).toThrow();
    expect(() => parseTomorrowPrices({ data: [record()] })).toThrow();
    expect(() => parseTodayPrices({ ...daily(), period_count: 24 })).toThrow();
    expect(() => parseTodayPrices(daily([record({ includes_vat: undefined })]))).toThrow();
  });
  it("displays UTC periods in Europe/Oslo", () => {
    const p = parseCurrentPrice(record());
    expect(p && priceHourLabel(p)).toBe("00:00");
  });
  it("handles both 23-hour spring and 25-hour autumn days", () => {
    for (const [date, count] of [["2026-03-29", 23], ["2026-10-25", 25]] as const) {
      const range = priceDayRange("today", new Date(`${date}T12:00:00Z`));
      expect((range.end.getTime() - range.start.getTime()) / 3600_000).toBe(count);
      expect(priceChartRows(parseTodayPrices(daily([], date)))).toHaveLength(count);
    }
  });
  it("distinguishes repeated Oslo hours and marks current period end-exclusively", () => {
    const a = parseCurrentPrice(record({ period_start: "2026-10-25T00:00:00Z", period_end: "2026-10-25T01:00:00Z" }));
    const b = parseCurrentPrice(record({ period_start: "2026-10-25T01:00:00Z", period_end: "2026-10-25T02:00:00Z" }));
    if (!a || !b) throw new Error("Missing test records");
    expect(priceHourLabel(a)).toBe("02:00");
    expect(priceHourLabel(b)).toBe("02:00");
    expect(priceIntervalLabel(a)).not.toBe(priceIntervalLabel(b));
    expect(isCurrentPrice(a, new Date("2026-10-25T01:00:00Z"))).toBe(false);
    expect(isCurrentPrice(b, new Date("2026-10-25T01:00:00Z"))).toBe(true);
  });
  it("uses existing proxy and distinguishes absence from API failure", async () => {
    const request = (async (url: string) => { expect(url).toBe("/energy/api/v1/prices/tomorrow?area=NO2"); return new Response(null, { status: 404 }); }) as typeof fetch;
    expect(await fetchPrices("tomorrow", request)).toBeNull();
    await expect(fetchPrices("today", (async () => new Response(null, { status: 500 })) as typeof fetch)).rejects.toThrow("HTTP 500");
  });
});