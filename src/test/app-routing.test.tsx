import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { MODULES, moduleForPath, secondaryPath } from "@/lib/navigation";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("keeps water and energy as independent primary modules", () => {
    expect(MODULES.map(({ to }) => to)).toEqual(["/", "/energi"]);
    expect(moduleForPath("/historikk").id).toBe("water");
    expect(moduleForPath("/energi/enheter").id).toBe("energy");
    expect(moduleForPath("/energi-other").id).toBe("water");
  });

  it("preserves the four water destinations", () => {
    expect(MODULES[0].nav.map(({ to }) => to)).toEqual(["/", "/malepunkter", "/historikk", "/innstillinger"]);
  });

  it("provides the five energy destinations", () => {
    expect(MODULES[1].nav.map(({ to }) => to)).toEqual(["/energi", "/energi/elbillading", "/energi/stromforbruk", "/energi/strompriser", "/energi/enheter"]);
  });

  it("matches all navigation destinations and preserves legacy URLs", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const paths = [...MODULES.flatMap(({ nav }) => nav.map(({ to }) => to)), "/energi/historikk", "/energi/malepunkter", "/malepunkter/meter-1"];
    for (const path of paths) {
      expect(router.matchRoutes(path).at(-1)?.routeId).not.toBe(rootRouteId);
    }
  });

  it("associates legacy energy URLs with the appropriate secondary destination", () => {
    expect(secondaryPath("/energi/historikk")).toBe("/energi/stromforbruk");
    expect(secondaryPath("/energi/malepunkter")).toBe("/energi/enheter");
    expect(secondaryPath("/historikk")).toBe("/historikk");
  });

  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
