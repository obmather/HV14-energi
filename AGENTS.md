<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## HV14 Water rules
- The existing FastAPI backend is the only data source; never add a database, ingestion, or Lovable Cloud for readings. Why: spec mandates PostgreSQL/FastAPI as authority.
- All API field mapping lives in `src/lib/water/api-client.ts`; document assumptions in `docs/backend-contract.md`. Why: OpenAPI schema not yet confirmed.
- Data is fetched in the browser via React Query (`src/lib/water/queries.ts`), not SSR loaders. Why: the API is on a private network reachable from the user's browser, not the edge server.
- Mock data lives only in `mock-adapter.ts` and must always be labeled as simulated in the UI. Why: mock must never look like live readings.
- Missing buckets are `null`/"missing", never 0; consumption is never interpolated. Why: data integrity requirement.
- Display timezone is Europe/Oslo via `src/lib/water/time.ts`/`format.ts`.
- Daily consumption comes from backend `/api/consumption` (quality_status preserved); hourly is derived from register differences. Why: backend is authoritative for consumption; register diffs avoid double-counting instant+hourly readings.
- Measurement points are authoritative for names and meter→channel links; meters and measurement points stay separate types. Why: backend contract.
- Production uses same-origin `/api` requests (empty base URL), no CORS. Why: runs in Docker behind a proxy on the private server.
- HV14 is one shared frontend with modules: Vann at `/` and Energi under `/energi`; `src/lib/navigation.ts` defines modules, secondary destinations and legacy active-path aliases, and `AppShell` renders both navigation levels from the URL. Why: scalable navigation with one source of truth and preserved existing URLs.
- Production architecture places HV14 behind an Nginx reverse proxy with independent Vann-API → PostgreSQL `hv14_water` and Energi-API → PostgreSQL `hv14_energy` services; frontend modules must access their respective APIs, never databases directly or each other's data. Why: the user's architecture separates module services and data ownership.
- Energi has no backend yet; its data is simulated in `src/lib/energy/data.ts` and always labeled "Simulert". Why: mock must never look like live readings.
