/**
 * HV14 Energi – simulated data layer. The existing /energy/api/ backend is
 * operational, but its response contract is not integrated here yet. All
 * readings below are deterministic simulations labeled "Simulert" in the UI.
 */
import { queryOptions } from "@tanstack/react-query";

export interface EnergyMeter {
  id: string;
  name: string;
  location: string;
  type: string;
}

export interface EnergyDay {
  date: Date;
  kwh: number | null; // null = missing, never 0
}

export const ENERGY_METERS: EnergyMeter[] = [
  { id: "e1", name: "EM 1 – Hovedhus", location: "Sikringsskap, teknisk rom", type: "Strøm" },
  { id: "e2", name: "EM 2 – Varmepumpe", location: "Bryggeri / garasje", type: "Varme" },
];

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

export function simulateDays(meterId: string, days: number, today = new Date()): EnergyDay[] {
  const rnd = seeded(meterId === "e1" ? 7 : 13);
  const base = meterId === "e1" ? 32 : 14;
  const out: EnergyDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const r = rnd();
    out.push({ date: d, kwh: r < 0.04 ? null : Math.round((base * (0.75 + r * 0.5)) * 10) / 10 });
  }
  return out;
}

/** Sum of known values; missing days are excluded, never counted as 0. */
export function totalKwh(days: EnergyDay[]): number {
  return days.reduce((a, d) => a + (d.kwh ?? 0), 0);
}

export const formatKwh = (v: number, digits = 1) =>
  `${new Intl.NumberFormat("nb-NO", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v)} kWh`;

export const energyMetersQuery = () =>
  queryOptions({ queryKey: ["hv14", "energi", "meters"], queryFn: async () => ENERGY_METERS, staleTime: Infinity });

export const energyDaysQuery = (meterId: string, days: number) =>
  queryOptions({
    queryKey: ["hv14", "energi", "days", meterId, days],
    queryFn: async () => simulateDays(meterId, days),
    staleTime: 60_000,
  });
