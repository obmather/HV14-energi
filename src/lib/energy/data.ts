/**
 * HV14 Energi – configured measurement points. A measurement point is the
 * permanent location; the physical meter (manufacturer) may be replaced
 * without losing the point's history. Only explicitly configured points are
 * shown. No readings are simulated: until the Aidon HAN integration exists,
 * consumption is unavailable (null), never fabricated.
 */
import { queryOptions } from "@tanstack/react-query";

export interface EnergyMeter {
  /** Technical measurement-point id. */
  id: string;
  name: string;
  location: string;
  type: string;
  role: "main" | "submeter";
  /** Physical meter currently installed at this point. */
  manufacturer: string | null;
  description: string;
  /** True only when a real data source is integrated. */
  connected: boolean;
}

export interface EnergyDay {
  date: Date;
  kwh: number | null; // null = missing, never 0
}

export const ENERGY_METERS: EnergyMeter[] = [
  {
    id: "main",
    name: "Hovedmåler",
    location: "Hovedhus",
    type: "Strøm",
    role: "main",
    manufacturer: "Aidon",
    description: "Måler hele eiendommens strømforbruk.",
    connected: false,
  },
];

export const MAIN_METER = ENERGY_METERS.find((m) => m.role === "main")!;

/** Sum of known values; missing days are excluded, never counted as 0. */
export function totalKwh(days: EnergyDay[]): number {
  return days.reduce((a, d) => a + (d.kwh ?? 0), 0);
}

export const formatKwh = (v: number, digits = 1) =>
  `${new Intl.NumberFormat("nb-NO", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v)} kWh`;

export const energyMetersQuery = () =>
  queryOptions({ queryKey: ["hv14", "energi", "meters"], queryFn: async () => ENERGY_METERS, staleTime: Infinity });
