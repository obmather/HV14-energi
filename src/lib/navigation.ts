import { BarChart3, BatteryCharging, CircleDollarSign, Cpu, Gauge, LayoutGrid, Settings, Waves, Zap } from "lucide-react";

const WATER_NAV = [
  { to: "/", label: "Oversikt", icon: LayoutGrid, exact: true },
  { to: "/malepunkter", label: "Målepunkter", icon: Gauge, exact: false },
  { to: "/historikk", label: "Historikk", icon: BarChart3, exact: false },
  { to: "/innstillinger", label: "Innstillinger", icon: Settings, exact: false },
] as const;

const ENERGY_NAV = [
  { to: "/energi", label: "Oversikt", icon: LayoutGrid, exact: true },
  { to: "/energi/elbillading", label: "Elbillading", icon: BatteryCharging, exact: false },
  { to: "/energi/stromforbruk", label: "Strømforbruk", icon: BarChart3, exact: false },
  { to: "/energi/strompriser", label: "Strømpriser", icon: CircleDollarSign, exact: false },
  { to: "/energi/enheter", label: "Enheter", icon: Cpu, exact: false },
  { to: "/energi/innstillinger", label: "Innstillinger", icon: Settings, exact: false },
] as const;

export const MODULES = [
  { id: "water", to: "/", label: "Vann", icon: Waves, nav: WATER_NAV },
  { id: "energy", to: "/energi", label: "Energi", icon: Zap, nav: ENERGY_NAV },
] as const;

export function moduleForPath(pathname: string) {
  return MODULES.find((module) => module.to !== "/" && (pathname === module.to || pathname.startsWith(`${module.to}/`))) ?? MODULES[0];
}

export function secondaryPath(pathname: string) {
  if (pathname === "/energi/historikk" || pathname === "/energi/historikk/") return "/energi/stromforbruk";
  if (pathname === "/energi/malepunkter" || pathname === "/energi/malepunkter/") return "/energi/enheter";
  return pathname;
}