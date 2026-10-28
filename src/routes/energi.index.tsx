import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/water/AppShell";
import { QueryError } from "@/components/water/status";
import { EnergyChart } from "@/components/energy/EnergyChart";
import { EnergyMockBadge } from "@/components/energy/status";
import { energyDaysQuery, energyMetersQuery, formatKwh, totalKwh, type EnergyMeter } from "@/lib/energy/data";

export const Route = createFileRoute("/energi/")({
  head: () => ({
    meta: [
      { title: "Oversikt – HV14 Energi" },
      { name: "description", content: "Oversikt over energimålere og energiforbruk i HV14 Energi." },
      { property: "og:title", content: "Oversikt – HV14 Energi" },
      { property: "og:description", content: "Oversikt over energimålere og energiforbruk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EnergyOverview,
});

function EnergyMeterCard({ meter }: { meter: EnergyMeter }) {
  const q = useQuery(energyDaysQuery(meter.id, 30));
  return (
    <article className="surface flex flex-col gap-5 p-5 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">{meter.name}</h2>
            <p className="text-sm text-muted-foreground">{meter.location}</p>
          </div>
        </div>
        <Link
          to="/energi/malepunkter"
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-accent"
        >
          Detaljer <ChevronRight className="h-4 w-4" />
        </Link>
      </header>
      {q.isPending ? (
        <Skeleton className="h-64" />
      ) : q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : (
        <>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Forbruk siste 30 dager</span>
              <EnergyMockBadge />
            </div>
            <div className="text-4xl font-semibold tracking-tight tabular">{formatKwh(totalKwh(q.data), 0)}</div>
            <div className="text-sm text-muted-foreground">
              I går: {q.data.at(-2)?.kwh != null ? formatKwh(q.data.at(-2)!.kwh!) : "Mangler data"}
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <h3 className="mb-3 text-sm font-semibold">Energiforbruk per dag</h3>
            <EnergyChart days={q.data} />
          </div>
        </>
      )}
    </article>
  );
}

function EnergyOverview() {
  const q = useQuery(energyMetersQuery());
  return (
    <>
      <PageHeader title="Oversikt" subtitle="Energiforbruk for alle energimålere" />
      {q.isPending ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[560px]" />
          <Skeleton className="h-[560px]" />
        </div>
      ) : q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {q.data.map((m) => (
            <EnergyMeterCard key={m.id} meter={m} />
          ))}
        </div>
      )}
    </>
  );
}
