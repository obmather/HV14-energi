/**
 * Runtime configuration for HV14 Water. All values come from build-time env
 * (VITE_*). No credentials or server addresses are hardcoded here.
 */

export type DataMode = "api" | "mock";

const env = import.meta.env as Record<string, string | undefined>;

const rawBase = (env["VITE_HV14_API_BASE_URL"] ?? "").trim().replace(/\/+$/, "");
const rawMode = (env["VITE_HV14_DATA_MODE"] ?? "").trim().toLowerCase();

/** "mock" only when explicitly requested or no API base URL is configured. */
export const DATA_MODE: DataMode =
  rawMode === "mock" ? "mock" : rawMode === "api" || rawBase ? "api" : "mock";

/** Empty string means same-origin (e.g. behind a reverse proxy at /api). */
export const API_BASE_URL = rawBase;

/** Readings older than this are shown as "Forsinket". MP 1 sends ~every 6 h. */
export const FRESHNESS_THRESHOLD_HOURS = Number(env["VITE_HV14_FRESHNESS_HOURS"]) > 0
  ? Number(env["VITE_HV14_FRESHNESS_HOURS"])
  : 8;

export const API_TIMEOUT_MS = 15_000;

export const DISPLAY_TIME_ZONE = "Europe/Oslo";

/**
 * Fallback metadata for the initial measurement points, used only for fields
 * the backend does not (yet) return. Backend values always take precedence.
 */
export const METER_METADATA_FALLBACK: Record<
  string,
  Partial<{
    name: string;
    location: string;
    serialNumber: string;
    manufacturer: string;
    model: string;
    devEui: string;
  }>
> = {
  "1": {
    name: "MP 1 – Hovedhus",
    location: "Teknisk rom / vaskerom",
    serialNumber: "05379494",
    manufacturer: "Axioma",
    model: "Qalcosonic W1",
    devEui: "00070900005215A6",
  },
  "2": {
    name: "MP 2 – Bryggeri/Garasje",
    location: "Bryggeri / garasje",
    serialNumber: "05877989",
    manufacturer: "Axioma",
    model: "Qalcosonic W1",
    devEui: "8C83FC050059B0E5",
  },
};
