import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { dailyConsumptionQuery, metersQuery, readingsQuery } from "@/lib/water/queries";
import { computeConsumption, dailyBucketsFromBackend, dailyLimitFor, summarize } from "@/lib/water/consumption";
import { formatConsumption, pickUnit } from "@/lib/water/format";
import { addOsloDays, osloMidnight, startOfHour, startOfOsloDay, zonedParts } from "@/lib/water/time";
import type { Granularity } from "@/lib/water/types";
import { ChartLegend, ConsumptionChart } from "./ConsumptionChart";
import { EmptyState, QueryError } from "./status";

type RangeKey = "24h" | "7d" | "30d" | "custom";

const RANGE_LABEL: Record<RangeKey, string> = {
  "24h": "24 timer",
  "7d": "7 dager",
  "30d": "30 dager",
  custom: "Egendefinert",
};

const isoDay = (d: Date) => {
  const z = zonedParts(d);
  return `${z.year}-${String(z.month).padStart(2, "0")}-${String(z.day).padStart(2, "0")}`;
};
const parseIsoDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return y && m && d ? osloMidnight(y, m, d) : null;
};

export function ConsumptionPanel({ meterId, compact = false }: { meterId: string; compact?: boolean }) {
  const [granularity, setGranularity] = useState<Granularity>("hour");
  const [range, setRange] = useState<RangeKey>(compact ? "24h" : "7d");
  const [customFrom, setCustomFrom] = useState(() => isoDay(addOsloDays(startOfOsloDay(new Date()), -6)));
  const [customTo, setCustomTo] = useState(() => isoDay(new Date()));
  const readingsQ = useQuery({ ...readingsQuery(meterId), enabled: granularity === "hour" });
  const metersQ = useQuery(metersQuery());
  const channelId = metersQ.data?.find((m) => m.id === meterId)?.channelId ?? null;

  const { from, to } = useMemo(() => {
    const now = new Date();
    const nextHour = new Date(startOfHour(now).getTime() + 3600_000);
    const tomorrow = addOsloDays(startOfOsloDay(now), 1);
    const end = granularity === "hour" ? nextHour : tomorrow;
    if (range === "24h") return { from: new Date(end.getTime() - (granularity === "hour" ? 24 : 24) * 3600_000), to: end };
    if (range === "7d") return { from: granularity === "hour" ? new Date(end.getTime() - 168 * 3600_000) : addOsloDays(tomorrow, -7), to: end };
    if (range === "30d") return { from: granularity === "hour" ? new Date(end.getTime() - 720 * 3600_000) : addOsloDays(tomorrow, -30), to: end };
    const f = parseIsoDay(customFrom) ?? addOsloDays(tomorrow, -7);
    const t = parseIsoDay(customTo);
    return { from: f, to: t ? addOsloDays(t, 1) : tomorrow };
  }, [range, granularity, customFrom, customTo]);

  // Daily: backend-calculated consumption per measurement point. Hourly: derived from register readings.
  const limit = dailyLimitFor(from);
  const dailyQ = useQuery({
    ...dailyConsumptionQuery(channelId ?? "", limit),
    enabled: granularity === "day" && channelId != null,
  });
  const noChannel = granularity === "day" && metersQ.isSuccess && channelId == null;
  const q = granularity === "hour" ? readingsQ : metersQ.isError ? metersQ : dailyQ;
  const pending = granularity === "hour" ? readingsQ.isPending : !noChannel && (metersQ.isPending || dailyQ.isPending);

  const buckets = useMemo(() => {
    if (to <= from) return [];
    if (granularity === "hour") return readingsQ.data ? computeConsumption(readingsQ.data, from, to, "hour") : [];
    return dailyQ.data ? dailyBucketsFromBackend(dailyQ.data, from, to) : [];
  }, [readingsQ.data, dailyQ.data, from, to, granularity]);
  const partial = buckets.filter((b) => b.quality === "partial").length;
  const stats = summarize(buckets);
  const unit = pickUnit(Math.max(0, ...buckets.map((b) => b.valueM3 ?? 0)));
  const tooMany = buckets.length > 24 * 31;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={granularity}
          onValueChange={(v) => v && setGranularity(v as Granularity)}
        >
          <ToggleGroupItem value="hour">Per time</ToggleGroupItem>
          <ToggleGroupItem value="day">Per døgn</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          size="sm"
          value={range}
          onValueChange={(v) => v && setRange(v as RangeKey)}
        >
          {(compact ? (["24h", "7d", "30d"] as RangeKey[]) : (Object.keys(RANGE_LABEL) as RangeKey[])).map((k) => (
            <ToggleGroupItem key={k} value={k} className="text-xs">
              {RANGE_LABEL[k]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {range === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="text-muted-foreground" htmlFor={`from-${meterId}`}>Fra</label>
          <Input id={`from-${meterId}`} type="date" className="h-8 w-auto" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <label className="text-muted-foreground" htmlFor={`to-${meterId}`}>Til</label>
          <Input id={`to-${meterId}`} type="date" className="h-8 w-auto" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </div>
      )}

      {noChannel ? (
        <EmptyState>Måleren er ikke knyttet til et målepunkt</EmptyState>
      ) : pending ? (
        <Skeleton className="h-[220px] w-full" />
      ) : q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : to <= from ? (
        <EmptyState>Ugyldig periode</EmptyState>
      ) : tooMany ? (
        <EmptyState>For lang periode for timevisning – velg «Per døgn».</EmptyState>
      ) : stats.measured === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ConsumptionChart buckets={buckets} granularity={granularity} height={compact ? 180 : 260} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ChartLegend showPartial={granularity === "day"} />
            <div className="text-xs text-muted-foreground">
              Sum målt: <span className="font-semibold tabular text-foreground">{formatConsumption(stats.total, unit)}</span>
              {partial > 0 && <> · {partial} døgn med delvise data</>}
              {stats.missing > 0 && <> · {stats.missing} {granularity === "hour" ? "timer" : "døgn"} mangler</>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
