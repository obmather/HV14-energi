import { rootRouteId } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { getRouter } from "@/router";
import { APP_MODE, routeBelongsToApp } from "@/lib/app-mode";
import { MODULES } from "@/lib/navigation";

describe("Deployed app route registration", () => {
  it("registers only the selected application's destinations", () => {
    const router = getRouter();
    for (const path of [...MODULES.flatMap(({ nav }) => nav.map(({ to }) => to)), "/energi/historikk", "/energi/malepunkter", "/malepunkter/meter-1"]) {
      const matches = router.matchRoutes(path);
      const contentMatch = matches.length > 1;
      expect(contentMatch, `${APP_MODE}: ${path}`).toBe(routeBelongsToApp(path, APP_MODE));
    }
  });
});

describe("Deployed Energi routing", () => {
  // The server forwards "/energi/stromforbruk" to the router as "/stromforbruk",
  // because "/energi" is the app's base path. Those addresses must still land on
  // an Energi page instead of the not-found route.
  it("matches addresses that arrive without the /energi base path", async () => {
    vi.stubEnv("VITE_HV14_APP", "energy");
    vi.resetModules();
    try {
      const { getRouter: buildRouter } = await import("@/router");
      const router = buildRouter();
      for (const [address, route] of [["/", "/energi"], ["/stromforbruk", "/energi/stromforbruk"]] as const) {
        const location = router.parseLocation({ pathname: address, href: address, search: "", hash: "" });
        expect(location.pathname, address).toBe(route);
        expect(router.matchRoutes(location.pathname).at(-1)?.routeId, address).not.toBe(rootRouteId);
      }
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
