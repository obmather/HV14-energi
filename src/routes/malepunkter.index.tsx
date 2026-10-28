import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/water/AppShell";
import { EmptyState, FreshnessBadge, QueryError } from "@/components/water/status";
import { latestQuery, metersQuery } from "@/lib/water/queries";
import { freshnessOf } from "@/lib/water/freshness";
import { FRESHNESS_THRESHOLD_HOURS } from "@/lib/water/config";
import { formatDateTime, formatM3 } from "@/lib/water/format";
import type { Meter } from "@/lib/water/types";

export const Route = createFileRoute("/malepunkter/")({
  head: () => ({
    meta: [
      { title: "Målepunkter – HV14 Water" },
      { name: "description", content: "Alle registrerte målepunkter og vannmålere i HV14 Water." },
      { property: "og:title", content: "Målepunkter – HV14 Water" },
      { property: "og:description", content: "Alle registrerte målepunkter og vannmålere." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MeasurementPoints,
});

function Row({ meter }: { meter: Meter }) {
  const q = useQuery(latestQuery(meter.id));
  return (
    <Link
      to="/malepunkter/$meterId"
      params={{ meterId: meter.id }}
      className="grid grid-cols-1 items-center gap-2 px-5 py-4 transition-colors hover:bg-accent/50 sm:grid-cols-[2fr_1fr_1.3fr_auto_auto]"
    >
      <div>
        <div className="font-medium">{meter.name}</div>
        <div className="text-sm text-muted-foreground">{meter.location ?? "–"}</div>
      </div>
      <div className="font-mono text-sm">{meter.serialNumber ?? "–"}</div>
      <div className="text-sm">
        {q.isPending ? (
          <Skeleton className="h-5 w-32" />
        ) : q.isError ? (
          <span className="text-destructive">Kunne ikke hente</span>
        ) : q.data ? (
          <>
            <div className="font-semibold tabular">{formatM3(q.data.valueM3)}</div>
            <div className="text-xs text-muted-foreground">{formatDateTime(q.data.measuredAt)}</div>
          </>
        ) : (
          <span className="text-muted-foreground">Ingen målinger</span>
        )}
      </div>
      <div>{!q.isPending && <FreshnessBadge state={q.isError ? "unavailable" : freshnessOf(q.data, FRESHNESS_THRESHOLD_HOURS)} />}</div>
      <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
    </Link>
  );
}

function MeasurementPoints() {
  const q = useQuery(metersQuery());
  return (
    <>
      <PageHeader title="Målepunkter" subtitle="Registrerte vannmålere" />
      {q.isPending ? (
        <Skeleton className="h-40" />
      ) : q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState>Ingen registrerte målepunkter</EmptyState>
      ) : (
        <div className="surface divide-y divide-border overflow-hidden">
          {q.data.map((m) => (
            <Row key={m.id} meter={m} />
          ))}
        </div>
      )}
    </>
  );
}
