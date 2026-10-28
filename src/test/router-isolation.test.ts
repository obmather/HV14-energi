import { describe, expect, it } from "vitest";
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