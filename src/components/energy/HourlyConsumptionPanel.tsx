import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber } from "@/lib/water/format";
import { formatKwh } from "@/lib/energy/data";
import { formatNok, hourLabel, hourlyConsumptionQuery, PERIOD_LABELS, type ConsumptionHour, type EnergyPeriod, type HourlyConsumption } from "@/lib/energy/aidon-client";

export function CoverageNote({ d }: { d: HourlyConsumption }) {
  if (d.completePeriod && !d.missingHours) return null;
  return (
    <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
      Ufullstendig periode: {d.validHours ?? 0} av {d.expectedHours ?? "?"} timer har målinger
      {d.missingHours ? ` (${d.missingHours} mangler)` : ""}.
    </p>
  );
}

export function HourlyChart({ hours, multiDay, height = 220 }: { hours: ConsumptionHour[]; multiDay: boolean; height?: number }) {
  // Missing hours stay null → gap in the chart, never drawn as zero.
  const rows = hours.map((h) => ({ key: h.start.getTime(), h, kwh: h.kwh }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="15%">
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="key" tickFormatter={(_, i) => { const h = rows[i]?.h; return h ? (multiDay ? `${formatDate(h.start).slice(0, 5)} ${hourLabel(h)}` : hourLabel(h)) : ""; }}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} minTickGap={24} />
          <YAxis width={52} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false}
            tickFormatter={(v: number) => formatNumber(v, 1)}
            label={{ value: "kWh", angle: -90, position: "insideLeft", offset: 12, style: { fontSize: 11, fill: "var(--color-muted-foreground)" } }} />
          <Tooltip cursor={{ fill: "var(--color-accent)" }} isAnimationActive={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const h = (payload[0]!.payload as (typeof rows)[number]).h;
              return (
                <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-card">
                  <div className="text-muted-foreground">{formatDate(h.start)} kl. {hourLabel(h)}</div>
                  <div className="mt-0.5 font-semibold tabular text-popover-foreground">{h.kwh == null ? "Mangler måling" : formatKwh(h.kwh, 2)}</div>
                  {h.spotCostNok != null && <div className="text-muted-foreground">Spotkostnad: {formatNok(h.spotCostNok)}</div>}
                </div>
              );
            }} />
          <Bar dataKey="kwh" fill="var(--color-primary)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HourlyConsumptionPanel() {
  const [period, setPeriod] = useState<Exclude<EnergyPeriod, "month">>("today");
  const q = useQuery(hourlyConsumptionQuery(period));
  return (
    <section className="surface flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Periode">
        {(Object.keys(PERIOD_LABELS) as (keyof typeof PERIOD_LABELS)[]).map((p) => (
          <Button key={p} size="sm" variant={p === period ? "default" : "outline"} onClick={() => setPeriod(p)} aria-pressed={p === period}>{PERIOD_LABELS[p]}</Button>
        ))}
      </div>
      {q.isPending ? <Skeleton className="h-72" /> : q.isError ? (
        <div className="flex h-60 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <BarChart3 className="h-6 w-6" /> Timeforbruk er utilgjengelig akkurat nå.
        </div>
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Målt forbruk</dt>
              <dd className="mt-1.5 text-xl font-semibold tabular">{q.data.totalKwh != null ? formatKwh(q.data.totalKwh, 2) : "Mangler data"}</dd>
            </div>
            <div className="rounded-lg border border-border p-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Beregnet spotkostnad</dt>
              <dd className="mt-1.5 text-xl font-semibold tabular">{q.data.totalSpotCostNok != null ? formatNok(q.data.totalSpotCostNok) : "Mangler data"}</dd>
              <p className="mt-1 text-xs text-muted-foreground">Uten nettleie, avgifter og påslag.{!q.data.completeCostPeriod && " Ufullstendig prisgrunnlag."}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Timer med målinger</dt>
              <dd className="mt-1.5 text-xl font-semibold tabular">{q.data.validHours ?? 0} / {q.data.expectedHours ?? "?"}</dd>
              <p className="mt-1 text-xs text-muted-foreground">{q.data.missingHours ? `${q.data.missingHours} timer mangler` : "Ingen manglende timer"}</p>
            </div>
          </dl>
          <CoverageNote d={q.data} />
          <HourlyChart hours={q.data.hours} multiDay={period === "7d"} height={280} />
        </>
      )}
    </section>
  );
}
