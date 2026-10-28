import { afterEach, describe, expect, it, vi } from "vitest";
import { apiSource } from "@/lib/water/api-client";

afterEach(() => vi.unstubAllGlobals());

describe("preserved water meter status adapter", () => {
  it("keeps the status endpoint and battery/error fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      serial_number: "05379494",
      received_at: "2026-10-28T10:00:00Z",
      raw: 5,
      low_battery: true,
      permanent_error: true,
      temporary_error: "sensor",
      unknown_bits: 4,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const status = await apiSource.getMeterStatus("1");

    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/meters/1/status");
    expect(status).toMatchObject({
      meterId: "1", serialNumber: "05379494", available: true,
      raw: 5, lowBattery: true, permanentError: true,
      temporaryError: "sensor", unknownBits: 4,
    });
    expect(status?.receivedAt?.toISOString()).toBe("2026-10-28T10:00:00.000Z");
  });

  it("preserves unavailable status on a missing endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    expect(await apiSource.getMeterStatus("1")).toBeNull();
  });
});