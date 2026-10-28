import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ConsumptionBucket, Granularity } from "@/lib/water/types";
import {
  formatConsumption,
  formatDate,
  formatNumber,
  formatTime,
  pickUnit,
  toUnit,
  unitLabel,
} from "@/lib/water/format";

interface Row {
  key: number;
  bucket: ConsumptionBucket;
  value: number | null;
  partial: number | null;
  missing: number | null;
  invalid: number | null;
}

export function ConsumptionChart({
  buckets,
  granularity,
  height = 220,
}: {
  buckets: ConsumptionBucket[];
  granularity: Granularity;
  height?: number;
}) {
  const max = Math.max(0, ...buckets.map((b) => b.valueM3 ?? 0));
  const unit = pickUnit(max);
  const top = max > 0 ? toUnit(max, unit) : unit === "L" ? 10 : 1;

  // Missing/invalid periods render as full-height faint bars – never as zero.
  const rows: Row[] = buckets.map((b) => ({
    key: b.start.getTime(),
    bucket: b,
    value: b.valueM3 == null || b.quality === "partial" ? null : toUnit(b.valueM3, unit),
    partial: b.valueM3 != null && b.quality === "partial" ? toUnit(b.valueM3, unit) : null,
    missing: b.status === "missing" ? top : null,
    invalid: b.status === "invalid" ? top : null,
  }));

  const tickFmt = (t: number) => {
    const d = new Date(t);
    return granularity === "hour" ? formatTime(d) : formatDate(d).slice(0, 5);
  };

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="15%">
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="key"
            tickFormatter={tickFmt}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
            minTickGap={24}
          />
          <YAxis
            width={52}
            domain={[0, top]}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatNumber(v, unit === "L" ? 0 : 2)}
            label={{
              value: unitLabel(unit),
              angle: -90,
              position: "insideLeft",
              offset: 12,
              style: { fontSize: 11, fill: "var(--color-muted-foreground)" },
            }}
          />
          <Tooltip
            cursor={{ fill: "var(--color-accent)" }}
            isAnimationActive={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const b = (payload[0]!.payload as Row).bucket;
              const when =
                granularity === "hour"
                  ? `${formatDate(b.start)} kl. ${formatTime(b.start)}–${formatTime(b.end)}`
                  : formatDate(b.start);
              const text =
                b.status === "missing"
                  ? "Mangler måling"
                  : b.status === "invalid"
                    ? "Ugyldig måling"
                    : formatConsumption(b.valueM3 ?? 0, unit);
              const quality =
                b.quality === "partial" ? "Delvise data" : b.quality === "complete" ? "Komplette data" : null;
              return (
                <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-card">
                  <div className="text-muted-foreground">{when}</div>
                  <div className="mt-0.5 font-semibold tabular text-popover-foreground">{text}</div>
                  {quality && <div className="text-muted-foreground">{quality}</div>}
                </div>
              );
            }}
          />
          <Bar dataKey="missing" stackId="s" fill="var(--color-missing)" fillOpacity={0.5} isAnimationActive={false} />
          <Bar dataKey="invalid" stackId="s" fill="var(--color-destructive)" fillOpacity={0.25} isAnimationActive={false} />
          <Bar dataKey="partial" stackId="s" fill="var(--color-primary)" fillOpacity={0.4} stroke="var(--color-primary)" strokeDasharray="3 2" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="value" stackId="s" fill="var(--color-primary)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({ showPartial = false }: { showPartial?: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Målt forbruk
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-missing" /> Mangler måling
      </span>
      {showPartial && (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-primary bg-primary/40" /> Delvise data
        </span>
      )}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-destructive/30" /> Ugyldig
      </span>
    </div>
  );
}
