import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Droplets } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { latestQuery } from "@/lib/water/queries";
import { FRESHNESS_THRESHOLD_HOURS } from "@/lib/water/config";
import { freshnessOf } from "@/lib/water/freshness";
import { formatDateTime, formatM3, formatRelative } from "@/lib/water/format";
import type { Meter } from "@/lib/water/types";
import { ConsumptionPanel } from "./ConsumptionPanel";
import { FreshnessBadge, MockBadge, QueryError } from "./status";

export function LatestReading({ meterId, large = true }: { meterId: string; large?: boolean }) {
  const q = useQuery(latestQuery(meterId));
  if (q.isPending) return <Skeleton className="h-16 w-56" />;
  if (q.isError) return <QueryError onRetry={() => q.refetch()} className="py-3" />;
  const r = q.data;
  const state = freshnessOf(r, FRESHNESS_THRESHOLD_HOURS);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Siste målerstand</span>
        <FreshnessBadge state={state} />
        <MockBadge />
      </div>
      <div className={`${large ? "text-4xl" : "text-2xl"} font-semibold tracking-tight tabular`}>
        {r?.valueM3 != null ? formatM3(r.valueM3) : "Ingen tilgjengelige målinger"}
      </div>
      {r && (
        <div className="text-sm text-muted-foreground">
          Sist avlest: {formatDateTime(r.measuredAt)}{" "}
          <span className="text-muted-foreground/70">({formatRelative(r.measuredAt)})</span>
          {r.receivedAt && <div>Mottatt: {formatDateTime(r.receivedAt)}</div>}
        </div>
      )}
    </div>
  );
}

export function MeterCard({ meter }: { meter: Meter }) {
  return (
    <article className="surface flex flex-col gap-5 p-5 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">{meter.name}</h2>
            {meter.location && <p className="text-sm text-muted-foreground">{meter.location}</p>}
          </div>
        </div>
        <Link
          to="/malepunkter/$meterId"
          params={{ meterId: meter.id }}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-accent"
        >
          Detaljer <ChevronRight className="h-4 w-4" />
        </Link>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Serienummer</dt>
        <dd className="font-mono">{meter.serialNumber ?? "–"}</dd>
        <dt className="text-muted-foreground">Måler</dt>
        <dd>{[meter.manufacturer, meter.model].filter(Boolean).join(" ") || "–"}</dd>
      </dl>

      <LatestReading meterId={meter.id} />

      <div className="border-t border-border pt-4">
        <h3 className="mb-3 text-sm font-semibold">Vannforbruk</h3>
        <ConsumptionPanel meterId={meter.id} compact />
      </div>
    </article>
  );
}
