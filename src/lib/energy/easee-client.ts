/**
 * HV14 Energi – typed client for the verified Energi-API endpoints
 * (/energy/api/v1). Real data only; no simulation in this module.
 */
import { queryOptions } from "@tanstack/react-query";

export const ENERGY_API_V1 = "/energy/api/v1";
const TIMEOUT_MS = 10_000;
/** A charger reading older than this is shown as stale. */
export const CHARGER_STALE_MINUTES = 15;

export interface DeviceState {
  deviceId: string;
  name: string;
  state: string | null;
  reportedAt: Date | null;
  receivedAt: Date | null;
}

export interface Measurement {
  id: number | null;
  deviceId: string;
  type: string;
  value: number | null;
  unit: string | null;
  measuredAt: Date | null;
  receivedAt: Date | null;
  quality: string | null;
}

export interface SystemStatus {
  status: string | null;
  database: string | null;
  deviceCount: number | null;
  measurementCount: number | null;
}

export interface Charger {
  deviceId: string;
  name: string;
  state: string | null;
  powerKw: Measurement | null;
  energyTotalKwh: Measurement | null;
  lastReceivedAt: Date | null;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (v == null || v === "" ? null : String(v));
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const date = (v: unknown) => {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

async function getJson(path: string, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${ENERGY_API_V1}${path}`, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export function parseDeviceStates(data: unknown): DeviceState[] {
  if (!isObj(data) || !Array.isArray(data['devices'])) throw new Error("Ugyldig svar");
  return data['devices'].filter(isObj).flatMap((d) => {
    const deviceId = str(d['device_id']);
    if (!deviceId) return [];
    return [{ deviceId, name: str(d['name']) ?? deviceId, state: str(d['state']), reportedAt: date(d['reported_at']), receivedAt: date(d['received_at']) }];
  });
}

export function parseMeasurements(data: unknown): Measurement[] {
  if (!isObj(data) || !Array.isArray(data['measurements'])) throw new Error("Ugyldig svar");
  return data['measurements'].filter(isObj).flatMap((m) => {
    const deviceId = str(m['device_id']);
    const type = str(m['measurement_type']);
    if (!deviceId || !type) return [];
    return [{
      id: num(m['id']), deviceId, type, value: num(m['value']), unit: str(m['unit']),
      measuredAt: date(m['measured_at']), receivedAt: date(m['received_at']), quality: str(m['quality']),
    }];
  });
}

export function parseSystemStatus(data: unknown): SystemStatus {
  if (!isObj(data)) throw new Error("Ugyldig svar");
  return { status: str(data['status']), database: str(data['database']), deviceCount: num(data['device_count']), measurementCount: num(data['measurement_count']) };
}

const latest = (a: Date | null, b: Date | null) => (!a ? b : !b ? a : a > b ? a : b);

/** Joins measurements to devices strictly by device_id; newest per type wins. */
export function buildChargers(devices: DeviceState[], measurements: Measurement[]): Charger[] {
  return devices.map((d) => {
    const mine = measurements.filter((m) => m.deviceId === d.deviceId);
    const pick = (type: string) =>
      mine.filter((m) => m.type === type).sort((a, b) => (b.measuredAt?.getTime() ?? 0) - (a.measuredAt?.getTime() ?? 0))[0] ?? null;
    const powerKw = pick("power");
    const energyTotalKwh = pick("energy_total");
    let last = d.receivedAt;
    for (const m of [powerKw, energyTotalKwh]) last = latest(last, m?.receivedAt ?? null);
    return { deviceId: d.deviceId, name: d.name, state: d.state, powerKw, energyTotalKwh, lastReceivedAt: last };
  });
}

export function isStale(at: Date | null, now = new Date()): boolean {
  return !at || now.getTime() - at.getTime() > CHARGER_STALE_MINUTES * 60_000;
}

const STATE_LABELS: Record<string, string> = {
  charging: "Lader",
  connected: "Tilkoblet",
  awaiting_start: "Venter på start",
  ready_to_charge: "Klar til lading",
  completed: "Ferdig ladet",
  disconnected: "Ikke tilkoblet",
  idle: "Ledig",
  error: "Feil",
  offline: "Frakoblet",
};
export const stateLabel = (s: string | null) => (s == null ? "Ukjent" : STATE_LABELS[s] ?? s);

const QUALITY_LABELS: Record<string, string> = { valid: "Gyldig", invalid: "Ugyldig", estimated: "Estimert", suspect: "Usikker" };
export const qualityLabel = (q: string | null) => (q == null ? "Ukjent" : QUALITY_LABELS[q] ?? q);

export const chargersQuery = () =>
  queryOptions({
    queryKey: ["hv14", "energi", "chargers"],
    queryFn: async () => {
      const [d, m] = await Promise.all([getJson("/devices/states"), getJson("/measurements/latest")]);
      return buildChargers(parseDeviceStates(d), parseMeasurements(m));
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  });

export const systemStatusQuery = () =>
  queryOptions({
    queryKey: ["hv14", "energi", "system-status"],
    queryFn: async () => parseSystemStatus(await getJson("/system/status")),
    refetchInterval: 60_000,
    retry: 1,
  });
