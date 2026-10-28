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

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    rewrite: {
      input: ({ url }) => { url.pathname = internalPath(url.pathname); return url; },
      output: ({ url }) => { url.pathname = publicPath(url.pathname); return url; },
    },
  });

  return router;
};
