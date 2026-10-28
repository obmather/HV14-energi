/** Domain models used by the UI. Independent of transport (HTTPS/MQTT). */

/** A physical meter, joined with the measurement point (channel) it serves. */
export interface Meter {
  id: string;
  /** Display name – from the measurement point when available. */
  name: string;
  location: string | null;
  serialNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  devEui: string | null;
  /** Measurement point (channel) this meter is installed on, if any. */
  channelId: string | null;
  installedAt: Date | null;
  includedInSiteTotal: boolean | null;
}

/** A measurement point (channel). Distinct from the physical meter. */
export interface MeasurementPoint {
  channelId: string;
  name: string;
  meterId: string | null;
  installedAt: Date | null;
  includedInSiteTotal: boolean | null;
}

export interface Reading {
  /** When the meter measured the value. */
  measuredAt: Date;
  /** When the backend received the message, if the backend exposes it. */
  receivedAt: Date | null;
  /** Cumulative meter register in m³. null = value missing/unparseable. */
  valueM3: number | null;
  type: string | null;
  /** Backend interval consumption in litres. null = unknown (not zero). */
  intervalConsumptionL?: number | null;
}

export type Granularity = "hour" | "day";

export type BucketStatus = "ok" | "zero" | "missing" | "invalid";

/** Backend data quality. "complete"/"partial" from the API; null = derived locally. */
export type QualityStatus = "complete" | "partial" | (string & {}) | null;

export interface ConsumptionBucket {
  start: Date;
  end: Date;
  /** Consumption in m³. null whenever status is missing or invalid. */
  valueM3: number | null;
  status: BucketStatus;
  quality?: QualityStatus;
}

/** One backend-calculated daily consumption row. */
export interface DailyConsumption {
  /** Oslo calendar day, YYYY-MM-DD. */
  day: string;
  consumptionL: number | null;
  quality: QualityStatus;
}

export type FreshnessState = "updated" | "delayed" | "unavailable";

/**
 * Meter status from the fPort 100 status message (Axioma W1).
 * Flag names follow Axioma's original English terms.
 */
export interface MeterStatus {
  meterId: string;
  serialNumber: string | null;
  /** false = no status message received yet. */
  available: boolean;
  /** When the backend received the status message. null when unavailable. */
  receivedAt: Date | null;
  /** Raw status byte, for reference. */
  raw: number | null;
  lowBattery: boolean;
  permanentError: boolean;
  /** Axioma temporary error type, e.g. "Dry", "Leakage", "Backflow", "Low Temperature", "Burst". null = none. */
  temporaryError: string | null;
  /** Bits set that the decoder does not know. 0 = none. */
  unknownBits: number;
}

export interface DataSource {
  mode: "api" | "mock";
  getMeters(): Promise<Meter[]>;
  getLatest(meterId: string): Promise<Reading | null>;
  getReadings(meterId: string): Promise<Reading[]>;
  /** Backend daily consumption for a measurement point, latest `limit` periods. */
  getDailyConsumption(channelId: string, limit: number): Promise<DailyConsumption[]>;
  /** Latest fPort 100 status message for a physical meter. null = none received. */
  getMeterStatus(meterId: string): Promise<MeterStatus | null>;
}
