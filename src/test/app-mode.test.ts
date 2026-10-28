import { describe, expect, it } from "vitest";
import { ENERGY_API_BASE, internalPath, publicPath, parseAppMode, routeBelongsToApp } from "@/lib/app-mode";
import { MODULES } from "@/lib/navigation";

describe("Independent HV14 applications", () => {
  it("prepares Vann under /vann/ while preserving legacy water URLs", () => {
    expect(internalPath("/vann/")).toBe("/");
    expect(internalPath("/vann/historikk")).toBe("/historikk");
    expect(internalPath("/historikk")).toBe("/historikk");
    expect(internalPath("/vann/malepunkter/meter-1")).toBe("/malepunkter/meter-1");
    expect(publicPath("/")).toBe("/vann/");
    expect(publicPath("/historikk")).toBe("/vann/historikk");
    expect(publicPath("/vann/historikk")).toBe("/vann/historikk");
    expect(internalPath("/vann-other")).toBe("/vann-other");
  });

  it("keeps Energi under /energi/", () => {
    expect(publicPath("/energi")).toBe("/energi/");
    expect(publicPath("/energi/enheter")).toBe("/energi/enheter");
    expect(internalPath("/energi/enheter")).toBe("/energi/enheter");
  });

  it("translates Energi's base-stripped addresses to its own routes", () => {
    expect(energyInternalPath("/")).toBe("/energi");
    expect(energyInternalPath("/elbillading")).toBe("/energi/elbillading");
    expect(energyInternalPath("/energi/enheter")).toBe("/energi/enheter");
    expect(energyPublicPath("/energi")).toBe("/");
    expect(energyPublicPath("/energi/stromforbruk")).toBe("/stromforbruk");
    expect(energyPublicPath("/vann/historikk")).toBe("/vann/historikk");
  });


  it("uses the required relative Energi API base", () => {
    expect(ENERGY_API_BASE).toBe("/energy/api/");
  });
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