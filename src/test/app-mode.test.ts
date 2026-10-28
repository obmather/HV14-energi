import { describe, expect, it } from "vitest";
import { parseAppMode, routeBelongsToApp } from "@/lib/app-mode";
import { MODULES } from "@/lib/navigation";

describe("Independent HV14 applications", () => {
  it("registers water pages only in the water application", () => {
    for (const { to } of MODULES[0].nav) expect(routeBelongsToApp(to, "water")).toBe(true);
    expect(routeBelongsToApp("/malepunkter/meter-1", "water")).toBe(true);
    for (const { to } of MODULES[1].nav) expect(routeBelongsToApp(to, "water")).toBe(false);
  });

  it("registers energy pages only in the energy application", () => {
    for (const { to } of MODULES[1].nav) expect(routeBelongsToApp(to, "energy")).toBe(true);
    expect(routeBelongsToApp("/energi/historikk", "energy")).toBe(true);
    expect(routeBelongsToApp("/energi/malepunkter", "energy")).toBe(true);
    for (const { to } of MODULES[0].nav) expect(routeBelongsToApp(to, "energy")).toBe(false);
    expect(routeBelongsToApp("/malepunkter/meter-1", "energy")).toBe(false);
  });

  it("allows both dashboards only in review mode", () => {
    expect(parseAppMode(undefined)).toBe("preview");
    expect(routeBelongsToApp("/", "preview")).toBe(true);
    expect(routeBelongsToApp("/energi", "preview")).toBe(true);
  });

  it("rejects invalid deployment selections", () => {
    expect(parseAppMode("water")).toBe("water");
    expect(parseAppMode("energy")).toBe("energy");
    expect(() => parseAppMode("combined-production")).toThrow();
  });
});