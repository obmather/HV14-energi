import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EnergyDay } from "@/lib/energy/data";
import { formatKwh } from "@/lib/energy/data";

const fmtDate = (t: number) =>
  new Intl.DateTimeFormat("nb-NO", { day: "2-digit", month: "2-digit", timeZone: "Europe/Oslo" }).format(new Date(t));

export function EnergyChart({ days, height = 220 }: { days: EnergyDay[]; height?: number }) {
  const max = Math.max(1, ...days.map((d) => d.kwh ?? 0));
  const rows = days.map((d) => ({ key: d.date.getTime(), value: d.kwh, missing: d.kwh == null ? max : null }));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="15%">
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="key"
            tickFormatter={fmtDate}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
            minTickGap={24}
          />
          <YAxis
            width={52}
            domain={[0, Math.ceil(max)]}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            label={{ value: "kWh", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fill: "var(--color-muted-foreground)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--color-accent)" }}
            contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
            labelFormatter={(l) => fmtDate(Number(l))}
            formatter={(v, name) => (name === "missing" ? ["Mangler data", ""] : [formatKwh(Number(v)), "Forbruk"])}
          />
          <Bar dataKey="value" stackId="a" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="missing" stackId="a" fill="var(--color-missing)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
