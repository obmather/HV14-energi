export type AppMode = "water" | "energy" | "preview";

export function parseAppMode(value: string | undefined): AppMode {
  if (!value || value === "preview") return "preview";
  if (value === "water" || value === "energy") return value;
  throw new Error("VITE_HV14_APP must be water, energy or preview");
}

export const APP_MODE = parseAppMode(import.meta.env['VITE_HV14_APP']);

export const ENERGY_API_BASE = "/energy/api/";

export function internalPath(path: string): string {
  if (path === "/vann" || path === "/vann/") return "/";
  return path.startsWith("/vann/") ? path.slice(5) : path;
}

export function publicPath(path: string): string {
  if (path === "/energi") return "/energi/";
  if (path.startsWith("/energi/")) return path;
  if (path === "/vann" || path.startsWith("/vann/")) return path;
  return path === "/" ? "/vann/" : `/vann${path}`;
}

export function routeBelongsToApp(path: string, mode: AppMode): boolean {
  if (mode === "preview") return true;
  const energy = path === "/energi" || path.startsWith("/energi/");
  return mode === "energy" ? energy : !energy;
}