import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { APP_MODE, internalPath, publicPath, routeBelongsToApp } from "./lib/app-mode";

// Independent deployments register only their own pages. The development
// preview retains both apps so their common visual identity can be reviewed.
const appRoutes = Object.values(routeTree.children ?? {}).filter((route) => routeBelongsToApp(route.options.path ?? "/", APP_MODE));
routeTree.addChildren(appRoutes);

const ENERGY_PREFIX = "/energi";

// The deployed Energi app is served from the "/energi" base path, so incoming
// URLs arrive there without the prefix while the shared route tree keeps it.
function energyInternalPath(pathname: string): string {
  if (pathname === "/" || pathname === "") return ENERGY_PREFIX;
  return pathname.startsWith(ENERGY_PREFIX) ? pathname : `${ENERGY_PREFIX}${pathname}`;
}

function energyPublicPath(pathname: string): string {
  if (pathname === ENERGY_PREFIX) return "/";
  return pathname.startsWith(`${ENERGY_PREFIX}/`) ? pathname.slice(ENERGY_PREFIX.length) : pathname;
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Only the joint development preview has to translate between the two apps'
  // URL prefixes; each deployed app already owns one through its base path.
  const rewrite =
    APP_MODE === "preview"
      ? {
          input: ({ url }: { url: URL }) => {
            url.pathname = internalPath(url.pathname);
            return url;
          },
          output: ({ url }: { url: URL }) => {
            url.pathname = publicPath(url.pathname);
            return url;
          },
        }
      : APP_MODE === "energy"
        ? {
            input: ({ url }: { url: URL }) => {
              url.pathname = energyInternalPath(url.pathname);
              return url;
            },
            output: ({ url }: { url: URL }) => {
              url.pathname = energyPublicPath(url.pathname);
              return url;
            },
          }
        : undefined;

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    rewrite,
  });

  return router;
};
