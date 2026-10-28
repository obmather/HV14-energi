import { describe, expect, it } from "vitest";
import { buildChargers, isStale, parseDeviceStates, parseMeasurements } from "@/lib/energy/easee-client";

const devices = parseDeviceStates({ devices: [
  { device_id: "other", name: "Other", state: "idle" },
  { device_id: "easee_mather", name: "Easee Mather", state: "charging", received_at: "2026-10-28T12:21:03Z" },
] });
const measurements = parseMeasurements({ measurements: [
  { id: 132, device_id: "easee_mather", measurement_type: "energy_total", value: 4991.721749, unit: "kWh", measured_at: "2026-10-28T12:21:03Z", quality: "valid" },
  { id: 131, device_id: "easee_mather", measurement_type: "power", value: 5.405, unit: "kW", measured_at: "2026-10-28T12:21:03Z", quality: "valid" },
] });

describe("Easee charger mapping", () => {
  it("matches measurements by device_id, not array position", () => {
    const [other, easee] = buildChargers(devices, measurements);
    expect(other!.powerKw).toBeNull();
    expect(easee!.powerKw!.value).toBe(5.405);
    expect(easee!.energyTotalKwh!.value).toBe(4991.721749);
  });
  it("marks readings older than 15 minutes as stale", () => {
    const now = new Date("2026-10-28T12:40:00Z");
    expect(isStale(new Date("2026-10-28T12:21:03Z"), now)).toBe(true);
    expect(isStale(new Date("2026-10-28T12:30:00Z"), now)).toBe(false);
  });
});
