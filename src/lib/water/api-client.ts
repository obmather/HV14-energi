import { API_BASE_URL, API_TIMEOUT_MS, METER_METADATA_FALLBACK } from "./config";
import type { DailyConsumption, DataSource, MeasurementPoint, Meter, MeterStatus, Reading } from "./types";

export type ApiErrorKind = "network" | "http" | "invalid" | "timeout";

export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

async function getJson(path: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new ApiError("timeout", "Tidsavbrudd");
    throw new ApiError("network", "Nettverksfeil");
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new ApiError("http", `HTTP ${res.status}`, res.status);
  try {
    return await res.json();
  } catch {
    throw new ApiError("invalid", "Ugyldig svar");
  }
}

/* ---------- Normalization (see docs/backend-contract.md) ---------- */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function pick(o: Obj, keys: string[]): unknown {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}
const str = (v: unknown) => (v == null || v === "" ? null : String(v));

function asList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (isObj(data)) {
    const inner = pick(data, ["meters", "measurement_points", "readings", "items", "data"]);
    if (Array.isArray(inner)) return inner;
  }
  throw new ApiError("invalid", "Forventet liste");
}

function parseDate(v: unknown): Date | null {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const bool = (v: unknown) => (typeof v === "boolean" ? v : null);

export function normalizeMeter(raw: unknown): Meter {
  if (!isObj(raw)) throw new ApiError("invalid", "Ugyldig måler");
  const id = str(pick(raw, ["meter_id", "id"]));
  if (!id) throw new ApiError("invalid", "Måler uten id");
  const fb = METER_METADATA_FALLBACK[id] ?? {};
  return {
    id,
    name: str(pick(raw, ["name", "display_name"])) ?? fb.name ?? `Måler ${id}`,
    location: str(pick(raw, ["location", "placement"])) ?? fb.location ?? null,
    serialNumber: str(pick(raw, ["serial_number", "serial"])) ?? fb.serialNumber ?? null,
    manufacturer: str(pick(raw, ["manufacturer"])) ?? fb.manufacturer ?? null,
    model: str(pick(raw, ["model"])) ?? fb.model ?? null,
    devEui: str(pick(raw, ["dev_eui"])) ?? fb.devEui ?? null,
    channelId: null,
    installedAt: null,
    includedInSiteTotal: null,
  };
}

export function normalizeMeasurementPoint(raw: unknown): MeasurementPoint | null {
  if (!isObj(raw)) return null;
  const channelId = str(raw["channel_id"]);
  if (!channelId) return null;
  return {
    channelId,
    name: str(raw["channel_name"]) ?? `Målepunkt ${channelId}`,
    meterId: str(raw["meter_id"]),
    installedAt: parseDate(raw["installed_at"]),
    includedInSiteTotal: bool(raw["included_in_site_total"]),
  };
}

/** Measurement points are authoritative for names and meter→channel links. */
export function joinMeters(meters: Meter[], points: MeasurementPoint[]): Meter[] {
  return meters.map((m) => {
    const p = points.find((x) => x.meterId === m.id);
    if (!p) return m;
    return { ...m, name: p.name, channelId: p.channelId, installedAt: p.installedAt, includedInSiteTotal: p.includedInSiteTotal };
  });
}

export function normalizeReading(raw: unknown): Reading | null {
  if (!isObj(raw)) return null;
  const measuredAt = parseDate(pick(raw, ["reading_at", "measured_at", "timestamp"]));
  if (!measuredAt) return null;
  let valueM3 = num(raw["volume_m3"]);
  if (valueM3 == null) {
    const l = num(raw["volume_l"]);
    valueM3 = l == null ? null : l / 1000;
  }
  return {
    measuredAt,
    receivedAt: parseDate(pick(raw, ["received_at"])),
    valueM3: valueM3 != null && valueM3 >= 0 ? valueM3 : null,
    type: str(pick(raw, ["reading_kind", "reading_type"])),
    intervalConsumptionL: num(raw["interval_consumption_l"]),
  };
}

export function normalizeDaily(raw: unknown): DailyConsumption | null {
  if (!isObj(raw)) return null;
  const day = str(raw["period_start"])?.slice(0, 10);
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const c = num(raw["consumption_l"]);
  return { day, consumptionL: c != null && c >= 0 ? c : null, quality: str(raw["quality_status"]) };
}

const enc = encodeURIComponent;

export const apiSource: DataSource = {
  mode: "api",
  async getMeters() {
    const [m, p] = await Promise.all([
      getJson("/api/meters"),
      getJson("/api/measurement-points").catch(() => null),
    ]);
    const meters = asList(m).map(normalizeMeter);
    const points = p == null ? [] : asList(p).map(normalizeMeasurementPoint).filter((x): x is MeasurementPoint => x !== null);
    return joinMeters(meters, points);
  },
  async getLatest(id) {
    try {
      const data = await getJson(`/api/meters/${enc(id)}/latest`);
      if (data == null) return null;
      return normalizeReading(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
  async getReadings(id) {
    const list = asList(await getJson(`/api/meters/${enc(id)}/readings`));
    return list.map(normalizeReading).filter((r): r is Reading => r !== null);
  },
  async getDailyConsumption(channelId, limit) {
    const data = await getJson(`/api/consumption?channel_id=${enc(channelId)}&period=daily&limit=${limit}`);
    return asList(data).map(normalizeDaily).filter((r): r is DailyConsumption => r !== null);
  },
  async getMeterStatus(id) {
    try {
      const raw = await getJson(`/api/meters/${enc(id)}/status`);
      if (!isObj(raw)) return null;
      const n = (k: string) => num(raw[k]);
      return {
        meterId: id,
        serialNumber: str(raw["serial_number"]),
        available: true,
        receivedAt: parseDate(pick(raw, ["received_at"])),
        raw: n("raw"),
        lowBattery: raw["low_battery"] === true,
        permanentError: raw["permanent_error"] === true,
        temporaryError: str(raw["temporary_error"]),
        unknownBits: n("unknown_bits") ?? 0,
      } satisfies MeterStatus;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },
};
