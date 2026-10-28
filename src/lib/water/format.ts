import { zonedParts } from "./time";

const pad = (n: number) => String(n).padStart(2, "0");

export function formatNumber(v: number, decimals: number): string {
  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
}

/** "708,027 m³" */
export function formatM3(v: number | null | undefined, decimals = 3): string {
  if (v == null || !Number.isFinite(v)) return "–";
  return `${formatNumber(v, decimals)} m³`;
}

export type ConsumptionUnit = "L" | "m3";

/** Liters for small volumes, m³ for large ones. Decided per chart, not per bar. */
export function pickUnit(maxM3: number): ConsumptionUnit {
  return maxM3 < 1 ? "L" : "m3";
}

export function toUnit(m3: number, unit: ConsumptionUnit): number {
  return unit === "L" ? m3 * 1000 : m3;
}

export function unitLabel(unit: ConsumptionUnit): string {
  return unit === "L" ? "liter" : "m³";
}

export function formatConsumption(m3: number, unit: ConsumptionUnit): string {
  return unit === "L"
    ? `${formatNumber(m3 * 1000, 0)} L`
    : `${formatNumber(m3, 3)} m³`;
}

/** "26.10.2026" in Europe/Oslo */
export function formatDate(d: Date): string {
  const z = zonedParts(d);
  return `${pad(z.day)}.${pad(z.month)}.${z.year}`;
}

/** "09:16" in Europe/Oslo */
export function formatTime(d: Date): string {
  const z = zonedParts(d);
  return `${pad(z.hour)}:${pad(z.minute)}`;
}

/** "26.10.2026 kl. 09:16" in Europe/Oslo */
export function formatDateTime(d: Date): string {
  return `${formatDate(d)} kl. ${formatTime(d)}`;
}

export function formatRelative(d: Date, now: Date = new Date()): string {
  const mins = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (mins < 1) return "nå nettopp";
  if (mins < 60) return `${mins} min siden`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} t siden`;
  return `${Math.round(h / 24)} døgn siden`;
}
