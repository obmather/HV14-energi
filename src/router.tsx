import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { APP_MODE, internalPath, publicPath, routeBelongsToApp } from "./lib/app-mode";

// Independent deployments register only their own pages. The development
// preview retains both apps so their common visual identity can be reviewed.
const appRoutes = Object.values(routeTree.children ?? {}).filter((route) => routeBelongsToApp(route.options.path ?? "/", APP_MODE));
routeTree.addChildren(appRoutes);

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Each deployed app already carries its own URL prefix (Vann "/vann", Energi
  // "/energi") through the build's base path, so only the joint development
  // preview has to translate between the two apps' internal route paths.
  const isPreview = APP_MODE === "preview";

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    basepath: isPreview ? "/" : APP_MODE === "water" ? "/vann" : "/",
    rewrite: isPreview
      ? {
          input: ({ url }) => { url.pathname = internalPath(url.pathname); return url; },
          output: ({ url }) => { url.pathname = publicPath(url.pathname); return url; },
        }
      : undefined,
  });

  return router;
};
