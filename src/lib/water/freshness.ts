import type { FreshnessState, Reading } from "./types";

/**
 * Freshness is about when the meter last reported, never about whether water
 * was consumed. A meter with zero consumption but recent readings is "updated".
 */
export function freshnessOf(
  latest: Reading | null | undefined,
  thresholdHours: number,
  now: Date = new Date(),
): FreshnessState {
  if (!latest || latest.valueM3 == null) return "unavailable";
  const ageH = (now.getTime() - latest.measuredAt.getTime()) / 3600_000;
  return ageH <= thresholdHours ? "updated" : "delayed";
}

export const FRESHNESS_LABEL: Record<FreshnessState, string> = {
  updated: "Oppdatert",
  delayed: "Forsinket",
  unavailable: "Utilgjengelig",
};
