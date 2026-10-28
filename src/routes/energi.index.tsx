import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ChevronRight, Gauge, PlugZap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/water/AppShell";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/water/format";
import { MAIN_METER } from "@/lib/energy/data";
import { chargersQuery, isStale, stateLabel } from "@/lib/energy/easee-client";

export const Route = createFileRoute("/energi/")({
  head: () => ({
    meta: [
      { title: "Totalt strømforbruk – HV14 Energi" },
      { name: "description", content: "Eiendommens totale strømforbruk fra hovedmåleren, og status for elbillading." },
      { property: "og:title", content: "Totalt strømforbruk – HV14 Energi" },
      { property: "og:description", content: "Eiendommens totale strømforbruk og status for elbillading." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EnergyOverview,
});

function Pill({ tone, children }: { tone: "ok" | "warn" | "muted"; children: React.ReactNode }) {
  const cls = tone === "ok" ? "bg-teal-soft text-teal" : tone === "warn" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{children}</span>;
}

const KPIS = [
  { label: "Effekt nå", unit: "kW" },
  { label: "Forbruk i dag", unit: "kWh" },
  { label: "Forbruk denne måneden", unit: "kWh" },
  { label: "Målerstand", unit: "kWh" },
];

function MainMeterSection() {
  const m = MAIN_METER;
  return (
    <section className="surface flex flex-col gap-5 p-5 sm:p-6" aria-labelledby="main-meter">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <h2 id="main-meter" className="text-lg font-semibold leading-tight">{m.name} – {m.location}</h2>
            <p className="text-sm text-muted-foreground">Måler: {m.manufacturer} · {m.description}</p>
          </div>
        </div>
        <Pill tone={m.connected ? "ok" : "muted"}>{m.connected ? "Tilkoblet" : "Ikke tilkoblet"}</Pill>
      </header>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-lg border border-border p-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label} ({k.unit})</dt>
            <dd className="mt-1.5 text-sm text-muted-foreground">Venter på måledata</dd>
          </div>
        ))}
      </dl>
      <div className="border-t border-border pt-4">
        <h3 className="mb-3 text-sm font-semibold">Strømforbruk over tid</h3>
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
          <BarChart3 className="h-5 w-5" />
          Historiske målinger blir tilgjengelige når hovedmåleren er tilkoblet.
        </div>
      </div>
    </section>
  );
}

function ChargerSummary() {
  const q = useQuery(chargersQuery());
  const c = q.data?.find((x) => /easee/i.test(x.deviceId) || /easee/i.test(x.name)) ?? q.data?.[0];
  return (
    <section className="surface flex flex-col gap-4 p-5" aria-labelledby="charger-summary">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal">
            <PlugZap className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 id="charger-summary" className="font-semibold leading-tight">Elbillading</h2>
            <p className="text-sm text-muted-foreground">{c?.name ?? "Easee Mather"}</p>
          </div>
        </div>
        <Link to="/energi/elbillading" className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-accent">
          Detaljer <ChevronRight className="h-4 w-4" />
        </Link>
      </header>
      {q.isPending ? (
        <Skeleton className="h-16" />
      ) : q.isError ? (
        <p className="text-sm text-muted-foreground">Ladedata er utilgjengelig akkurat nå.</p>
      ) : !c ? (
        <p className="text-sm text-muted-foreground">Ingen ladere funnet.</p>
      ) : (
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Ladestatus</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              <Pill tone={c.state === "charging" ? "ok" : "muted"}>{stateLabel(c.state)}</Pill>
              {isStale(c.lastReceivedAt) && <Pill tone="warn">Utdaterte data</Pill>}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ladeeffekt nå</dt>
            <dd className="font-medium tabular">
              {c.powerKw?.value != null ? `${formatNumber(c.powerKw.value, 2)} ${c.powerKw.unit ?? "kW"}` : <span className="text-muted-foreground">Mangler data</span>}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Sist oppdatert</dt>
            <dd className="font-medium">
              {c.lastReceivedAt ? <>{formatDateTime(c.lastReceivedAt)} <span className="text-muted-foreground">({formatRelative(c.lastReceivedAt)})</span></> : "Ukjent"}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function EnergyOverview() {
  return (
    <>
      <PageHeader title="Totalt strømforbruk" subtitle="Hele eiendommens strømforbruk, målt av hovedmåleren" />
      <div className="space-y-6">
        <MainMeterSection />
        <div className="grid gap-6 lg:grid-cols-2">
          <ChargerSummary />
        </div>
      </div>
    </>
  );
}
