# Independent HV14 dashboards

Vann and Energi use the same source/design system but are built and run as two independent applications. Each has its own process, dashboard, route registration and deployment lifecycle. They do not share a browser router across app transitions: primary navigation between deployed apps uses full-page links through Nginx.

| App | Build-time selection | Dashboard | API | Database owned by API |
| --- | --- | --- | --- | --- |
| Vann | `VITE_HV14_APP=water` | `/vann/` | Existing `/api/` (unchanged) | `hv14_water` |
| Energi | `VITE_HV14_APP=energy` | `/energi/` | Relative `/energy/api/` | `hv14_energy` |

The Lovable preview uses `preview` mode to review both dashboards in one environment. That is not the production topology. Unknown app-mode values fail rather than silently choosing an app. Both artifacts may contain shared/source route code; their registered routes and running processes are separate. This is not a security boundary: each API must enforce its own access controls.

## Self-hosted deployment

- `deploy/compose.yaml` builds two frontend containers. It assumes an existing external Docker network named `hv14`. Connect the existing Nginx and API services to it. No databases or API services are provisioned or altered by this configuration.
- Build-time environment variables cannot be changed merely by restarting the runtime container. Each build writes `.output`; use separate working directories/artifacts to avoid overwriting the other app.

### HV14 Vann

1. Install dependencies with `bun install --frozen-lockfile`.
2. Preserve the current water configuration. For the actual server use `VITE_HV14_DATA_MODE=api` and the existing empty `VITE_HV14_API_BASE_URL` so requests remain `/api/...`.
3. Run `bun run build:water` in the Vann working directory; this produces a Node-server artifact with water-only route registration and `/vann/` asset URLs.
4. Start with `HOST=0.0.0.0 PORT=3000 node .output/server/index.mjs`, or independently build/start the `water-frontend` service with `docker compose -f deploy/compose.yaml build water-frontend` then `docker compose -f deploy/compose.yaml up -d --no-deps water-frontend`.
5. Test `/vann/`, `/vann/historikk`, `/vann/malepunkter` and a known meter detail. Legacy `/`, `/historikk`, `/malepunkter`, `/innstillinger` and `/malepunkter/{meterId}` remain recognized without a forced redirect; new navigation emits `/vann/...`. Keep these legacy paths forwarded to Vann until migration is complete. Water readings, adapters and queries are unchanged.

### HV14 Energi

1. Install dependencies with `bun install --frozen-lockfile` in its own working directory.
2. Run `bun run build:energy`; this produces an independently deployable Node-server artifact with energy-only route registration and `/energi/` asset URLs.
3. Start with `HOST=0.0.0.0 PORT=3001 node .output/server/index.mjs`, or independently build/start `energy-frontend` with `docker compose -f deploy/compose.yaml build energy-frontend` then `docker compose -f deploy/compose.yaml up -d --no-deps energy-frontend`.
4. Test `/energi/` and each of its secondary pages. `ENERGY_API_BASE` is fixed to the relative `/energy/api/` path for the future adapter; do not use the water API or database.

### Existing reverse proxy: handoff only

No Nginx configuration is supplied, deployed or changed. The server operator handles forwarding `/vann/...` and legacy water paths to Vann, `/energi/...` to Energi, keeping `/api/` for the existing water API, and `/energy/api/` for the existing energy API. Page requests must preserve their URL path. Each app's prefixed static assets must resolve against its own `.output/public` files (remove only the app prefix when locating static files). Retain old hashed assets during rolling deployments. Hostnames, TLS, access controls and network details remain operator-owned.

## Verification and remaining work

Tests check that water mode excludes energy routes, energy mode excludes water routes, the relative energy API base is correct, migration URL mappings preserve existing destinations, and the deployed Energi app resolves addresses that arrive without its `/energi` base path. Each app's base path is applied by its build, and the server removes that prefix before routing; the app translates it back, so Nginx only has to forward the prefix unchanged. The two-container build, Node runtime entry and reverse proxy behavior must still be validated on the host; nothing has been deployed from Lovable.

Charger measurements on Elbillading and in the Overview charging summary come from the operational Energi API (`/energy/api/v1`). Total consumption still awaits Aidon HAN: the main meter is marked "Ikke tilkoblet" and shows empty states, and no consumption values are simulated. The Energi app no longer shows a development banner; Vann keeps its own. Database access always remains behind the respective API.

## Source revision and GitHub handoff

The separation is present in the local Lovable source history at commit `9c8af9089f60da21a86ec9e0a4f112b1ffc6b4cf` (`Split HV14 frontends`). Both frontends are in this same source tree, not in a newly created energy repository. Energy files include `src/routes/energi.*.tsx`, `src/components/energy/`, and `src/lib/energy/`; app selection and the relative API base are in `src/lib/app-mode.ts`.

This local commit is not proof that GitHub `origin/main` received it. On 2026-10-28, unauthenticated access to the repository's GitHub API returned 404 and no authenticated GitHub connector was available. Git sync status and the connected repository/branch must be checked in Lovable **Project settings → Git**. The agent cannot manually commit, push, connect a repository, or switch the synced branch. If this work is in a draft, it must be accepted before normal sync; if the status reports divergence, merge the newest `lovable-sync*` branch into the synced branch on GitHub rather than resetting or overwriting existing water work.

After sync is resolved, the server operator can verify the repository read-only:

```sh
git ls-remote origin refs/heads/main
git show origin/main:src/lib/app-mode.ts
git show origin/main:package.json
```

These inspect the remote head and locally fetched remote-tracking source respectively; `git show origin/main:...` only reflects the server's latest fetch. If `main` still points to `d7b01a8` and lacks the energy files, do not deploy that revision as the separated applications.

### Exact artifacts for Docker

| Application | Build command after dependency installation | Output | Runtime entry |
| --- | --- | --- | --- |
| Vann | `bun run build:water` | `.output/` in the Vann build workspace | `.output/server/index.mjs` |
| Energi | `bun run build:energy` | `.output/` in the Energi build workspace | `.output/server/index.mjs` |

Neither app produces a separate `dist/water` or `dist/energy` directory. Both use `.output/`, including `.output/public/` static files and `.output/server/` runtime files. Copy the **entire** `.output/` into each runtime image, not just static files. The supplied Dockerfile already does this; Compose builds each app in an isolated image build using `HV14_APP=water` or `HV14_APP=energy`.

The existing water status adapter (`getMeterStatus`, `/api/meters/{id}/status`) remains present. App separation did not add a status display; the endpoint mapping still requires confirmation against the water API contract. Frontend regression checks do not establish live server compatibility or a successful Docker deployment.