# Independent HV14 dashboards

Vann and Energi use the same source/design system but are built and run as two independent applications. Each has its own process, dashboard, route registration and deployment lifecycle. They do not share a browser router across app transitions: primary navigation between deployed apps uses full-page links through Nginx.

| App | Build-time selection | Dashboard | API | Database owned by API |
| --- | --- | --- | --- | --- |
| Vann | `VITE_HV14_APP=water` | `/` | Existing `/api/` | `hv14_water` |
| Energi | `VITE_HV14_APP=energy` | `/energi` | Reserved `/energy-api/` | `hv14_energy` |

The Lovable preview uses `preview` mode to review both dashboards in one environment. That is not the production topology. Unknown app-mode values fail rather than silently choosing an app. Both artifacts may contain shared/source route code; their registered routes and running processes are separate. This is not a security boundary: each API must enforce its own access controls.

## Self-hosted deployment

- `deploy/compose.yaml` builds two frontend containers. It assumes an existing external Docker network named `hv14`. Connect the existing Nginx and API services to it. No databases or API services are provisioned or altered by this configuration.
- Run `docker compose -f deploy/compose.yaml build` and `docker compose -f deploy/compose.yaml up -d` on the private host. Build-time environment variables cannot be changed merely by restarting the runtime container.
- Alternatively run `bun run build:water` and `bun run build:energy` in separate checkouts/work directories. Each writes `.output`; do not overwrite one artifact with the other. The self-hosted target is Nitro's `node-server`, started with `node .output/server/index.mjs`.
- Adapt `deploy/nginx.conf.example` inside the existing Nginx server block. API upstream names/ports are examples, not confirmed contract values. Preserve `/energi` in proxy requests and keep water's existing `/api/` unchanged.
- Publish the union of both `.output/public/assets/` directories to `/srv/hv14/assets/` on Nginx (a read-only mount works). Hashed assets from both independent builds must remain accessible. Keep old hashes during rolling deployments. Other static files use the existing water upstream.
- Validate the adapted Nginx configuration before reload. TLS, access controls, hostname, Docker network and upstream addresses remain host-specific and must be supplied by the operator.

## Verification and remaining work

Tests check that water mode excludes energy routes, energy mode excludes water routes, and existing destinations are preserved. The two-container build, Node runtime entry, merged static assets and Nginx routing must still be validated on the host; they have not been deployed from Lovable.

Energy readings remain explicitly simulated. No Energi API contract has been supplied; `/energy-api/` is a reserved proxy path, not a implemented data integration. Database access always remains behind the respective API.