import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/water/AppShell";
import { QueryError } from "@/components/water/status";
import { EnergyChart } from "@/components/energy/EnergyChart";
import { EnergyMockBadge } from "@/components/energy/status";
import { ENERGY_METERS, energyDaysQuery, formatKwh, totalKwh } from "@/lib/energy/data";

export const Route = createFileRoute("/energi/historikk")({
  head: () => ({
    meta: [
      { title: "Historikk – HV14 Energi" },
      { name: "description", content: "Historisk energiforbruk per energimåler." },
      { property: "og:title", content: "Historikk – HV14 Energi" },
      { property: "og:description", content: "Historisk energiforbruk per energimåler." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EnergyHistory,
});

const RANGES = [7, 30, 90] as const;
const btn =
  "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent data-[active=true]:bg-accent data-[active=true]:text-accent-foreground";

function EnergyHistory() {
  const [meterId, setMeterId] = useState(ENERGY_METERS[0]!.id);
  const [days, setDays] = useState<number>(30);
  const q = useQuery(energyDaysQuery(meterId, days));
  return (
    <>
      <PageHeader title="Historikk" subtitle="Energiforbruk over tid">
        <EnergyMockBadge />
      </PageHeader>
      <section className="surface space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {ENERGY_METERS.map((m) => (
              <button key={m.id} className={btn} data-active={m.id === meterId} onClick={() => setMeterId(m.id)}>
                {m.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button key={r} className={btn} data-active={r === days} onClick={() => setDays(r)}>
                {r} dager
              </button>
            ))}
          </div>
        </div>
        {q.isPending ? (
          <Skeleton className="h-80" />
        ) : q.isError ? (
          <QueryError onRetry={() => q.refetch()} />
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              Totalt: <span className="font-semibold text-foreground tabular">{formatKwh(totalKwh(q.data), 0)}</span>
            </div>
            <EnergyChart days={q.data} height={320} />
          </>
        )}
      </section>
    </>
  );
}
