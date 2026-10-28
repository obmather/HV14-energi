export type AppMode = "water" | "energy" | "preview";

export function parseAppMode(value: string | undefined): AppMode {
  if (!value || value === "preview") return "preview";
  if (value === "water" || value === "energy") return value;
  throw new Error("VITE_HV14_APP must be water, energy or preview");
}

export const APP_MODE = parseAppMode(import.meta.env.VITE_HV14_APP);

export function routeBelongsToApp(path: string, mode: AppMode): boolean {
  if (mode === "preview") return true;
  const energy = path === "/energi" || path.startsWith("/energi/");
  return mode === "energy" ? energy : !energy;
}