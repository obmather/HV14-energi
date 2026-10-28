import { useQuery } from "@tanstack/react-query";
import { BatteryCharging, PlugZap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/water/AppShell";
import { QueryError } from "@/components/water/status";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/water/format";
import { chargersQuery, isStale, qualityLabel, stateLabel, systemStatusQuery, type Charger, type Measurement } from "@/lib/energy/easee-client";

function Pill({ tone, children }: { tone: "ok" | "warn" | "muted"; children: React.ReactNode }) {
  const cls = tone === "ok" ? "bg-teal-soft text-teal" : tone === "warn" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{children}</span>;
}

function Value({ m, unit, decimals }: { m: Measurement | null; unit: string; decimals: number }) {
  if (!m || m.value == null) return <span className="text-muted-foreground">Mangler data</span>;
  return <>{formatNumber(m.value, decimals)} {m.unit ?? unit}</>;
}

function ChargerCard({ c }: { c: Charger }) {
  const stale = isStale(c.lastReceivedAt);
  const quality = c.powerKw?.quality ?? c.energyTotalKwh?.quality ?? null;
  return (
    <article className="surface flex flex-col gap-5 p-5 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal">
            <PlugZap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">{c.name}</h2>
            <p className="text-sm text-muted-foreground">Easee-lader</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Pill tone={c.state === "charging" ? "ok" : "muted"}>{stateLabel(c.state)}</Pill>
          {stale && <Pill tone="warn">Utdaterte data</Pill>}
        </div>
      </header>
      <div className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Effekt nå</span>
        <div className="text-4xl font-semibold tracking-tight tabular"><Value m={c.powerKw} unit="kW" decimals={2} /></div>
      </div>
      <dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Målerstand (totalt levert)</dt>
          <dd className="font-medium tabular"><Value m={c.energyTotalKwh} unit="kWh" decimals={1} /></dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Sist mottatt</dt>
          <dd className="font-medium">
            {c.lastReceivedAt ? <>{formatDateTime(c.lastReceivedAt)} <span className="text-muted-foreground">({formatRelative(c.lastReceivedAt)})</span></> : "Ukjent"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Datakvalitet</dt>
          <dd className="font-medium">{qualityLabel(quality)}</dd>
        </div>
      </dl>
    </article>
  );
}

export function ChargerPanel() {
  const q = useQuery(chargersQuery());
  const sys = useQuery(systemStatusQuery());
  const sysOk = sys.data?.status === "ok" && sys.data.database === "connected";
  return (
    <>
      <PageHeader title="Elbillading" subtitle="Status for ladestasjoner">
        {sys.isSuccess ? <Pill tone={sysOk ? "ok" : "warn"}>{sysOk ? "Energi-API tilkoblet" : "Energi-API har feil"}</Pill>
          : sys.isError ? <Pill tone="warn">Energi-API utilgjengelig</Pill> : null}
      </PageHeader>
      {q.isPending ? (
        <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-72" /></div>
      ) : q.isError ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Ladedata er ikke tilgjengelige akkurat nå. Siden prøver igjen automatisk.</p>
          <QueryError onRetry={() => q.refetch()} />
        </div>
      ) : q.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <BatteryCharging className="h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Ingen ladestasjoner registrert</h2>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {q.data.map((c) => <ChargerCard key={c.deviceId} c={c} />)}
        </div>
      )}
    </>
  );
}
