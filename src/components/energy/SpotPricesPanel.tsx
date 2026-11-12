import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CircleDollarSign, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/water/AppShell";
import { formatDate, formatDateTime, formatNumber, formatTime } from "@/lib/water/format";
import { dailyPricesQuery, isCurrentPrice, NORGESPRIS_ORE, PRICE_AREA, priceChartRows, priceIntervalLabel, priceOre, PriceResponseError, priceStats, type DailyPrices } from "@/lib/energy/prices-client";

const value = (n: number | null | undefined) => n == null ? "Mangler pris" : `${formatNumber(n, 2)} øre/kWh`;

function PriceChart({ data, now }: { data: DailyPrices; now: Date }) {
  const rows = priceChartRows(data);
  const missing = rows.filter((r) => r.ore === null).length;
  return <>
    {missing > 0 && <p className="text-sm text-warning">Ufullstendige priser: {missing} perioder mangler pris.</p>}
    <div className="h-72 w-full" aria-label="Spotpriser inkludert mva. med Norgespris på 50 øre per kWh">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 28, right: 20, left: 0, bottom: 0 }} barCategoryGap="15%">
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="startIso" tickFormatter={(v: string) => formatTime(new Date(v))} minTickGap={18}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
          <YAxis width={55} domain={[(min: number) => Math.min(min, 0), (max: number) => Math.max(max, 60)]} tickFormatter={(v: number) => formatNumber(v, 0)}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "var(--color-accent)" }} isAnimationActive={false} content={({ active, payload }) => {
            const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
            if (!active || !row) return null;
            return <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-card">
              <div className="text-muted-foreground">{row.price ? priceIntervalLabel(row.price) : formatDateTime(new Date(row.startIso))}</div>
              <div className="mt-1 font-semibold tabular">{value(row.ore)}</div>
              <div className="text-muted-foreground">Inkl. mva.</div>
              {row.ore != null && <div className="mt-1">Mot Norgespris: {row.ore >= NORGESPRIS_ORE ? "+" : ""}{formatNumber(row.ore - NORGESPRIS_ORE, 2)} øre/kWh</div>}
            </div>;
          }} />
          <ReferenceLine isFront y={NORGESPRIS_ORE} stroke="var(--color-warning)" strokeDasharray="5 4" label={{ value: "Norgespris · 50 øre/kWh", position: "insideTopRight", fill: "var(--color-warning)", fontSize: 11 }} />
          <Bar dataKey="ore" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {rows.map((r) => <Cell key={r.startIso} fill={r.price && isCurrentPrice(r.price, now) ? "var(--color-teal)" : "var(--color-primary)"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-primary" />Spotpris inkl. mva.</span>
      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-teal" />Gjeldende periode</span>
      <span className="flex items-center gap-2"><span className="w-5 border-t border-dashed border-warning" />Norgespris</span>
    </div>
    <details className="border-t border-border pt-4">
      <summary className="cursor-pointer text-sm font-medium">Priser per periode</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="py-2 font-medium">Tid (Oslo)</th><th className="py-2 text-right font-medium">øre/kWh inkl. mva.</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.startIso} className={r.price && isCurrentPrice(r.price, now) ? "bg-teal-soft" : "border-b border-border"}>
            <td className="py-2 pr-3">{r.price ? priceIntervalLabel(r.price) : formatDateTime(new Date(r.startIso))}{r.price && isCurrentPrice(r.price, now) && <span className="ml-2 text-xs text-teal">Nå</span>}</td>
            <td className="py-2 text-right tabular">{r.ore == null ? "Mangler pris" : formatNumber(r.ore, 2)}</td>
          </tr>)}</tbody></table>
      </div>
    </details>
  </>;
}

export function SpotPricesPanel() {
  const [day, setDay] = useState<"today" | "tomorrow">("today");
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(timer); }, []);
  const dateKey = now ? formatDate(now) : "";
  const today = useQuery({ ...dailyPricesQuery("today", dateKey), enabled: now !== null });
  const tomorrow = useQuery({ ...dailyPricesQuery("tomorrow", dateKey), enabled: now !== null && day === "tomorrow" });
  const q = day === "today" ? today : tomorrow;
  const current = now ? today.data?.prices.find((p) => isCurrentPrice(p, now)) : undefined;
  const currentOre = current ? priceOre(current) : null;
  const stats = q.data ? priceStats(q.data.prices) : null;
  const sources = q.data ? [...new Set(q.data.prices.map((p) => p.source))] : [];
  const retrieved = q.data?.prices.reduce<string | null>((latest, p) => !latest || Date.parse(p.retrievedIso) > Date.parse(latest) ? p.retrievedIso : latest, null);
  const labels = [{ label: "Laveste spotpris", n: stats?.min }, { label: "Høyeste spotpris", n: stats?.max }, { label: "Gjennomsnittlig spotpris", n: stats?.average }];
  return <>
    <PageHeader title="Strømpriser" subtitle={`Prisområde ${PRICE_AREA} · øre/kWh inkl. mva.`} />
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="surface p-5 sm:p-6"><dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Spotpris nå · {PRICE_AREA}</dt>
          <dd className="mt-2 text-2xl font-semibold tabular">{today.isPending ? <Skeleton className="h-8 w-40" /> : value(currentOre)}</dd>
          <p className="mt-2 text-xs text-muted-foreground">{today.isError ? "Dagens priser kunne ikke hentes." : current ? priceIntervalLabel(current) : "Ingen pris for gjeldende periode."}</p>
        </div>
        <div className="surface p-5 sm:p-6"><dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Norgespris</dt>
          <dd className="mt-2 text-2xl font-semibold tabular">50 øre/kWh</dd><p className="mt-2 text-xs text-muted-foreground">Inkl. mva. · kun prissammenligning</p>
          {currentOre != null && <p className="mt-2 text-sm">Spotpris er {formatNumber(Math.abs(currentOre - NORGESPRIS_ORE), 2)} øre/kWh {currentOre >= NORGESPRIS_ORE ? "over" : "under"} Norgespris.</p>}
        </div>
      </dl>
      <section className="surface space-y-5 p-5 sm:p-6" aria-labelledby="price-chart-title">
        <header className="flex flex-wrap items-center justify-between gap-3"><h2 id="price-chart-title" className="text-lg font-semibold">Spotpriser {day === "today" ? "i dag" : "i morgen"}</h2>
          <div className="flex gap-1" role="group" aria-label="Prisdag"><Button size="sm" variant={day === "today" ? "default" : "outline"} aria-pressed={day === "today"} onClick={() => setDay("today")}>I dag</Button><Button size="sm" variant={day === "tomorrow" ? "default" : "outline"} aria-pressed={day === "tomorrow"} onClick={() => setDay("tomorrow")}>I morgen</Button></div>
        </header>
        {q.isPending ? <Skeleton className="h-80" /> : q.isError ? <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
          <CircleDollarSign className="h-7 w-7 text-muted-foreground" /><p className="text-sm">{q.error instanceof PriceResponseError ? "Prisdata har et ukjent eller ugyldig format." : "Kunne ikke hente strømpriser. API-et er utilgjengelig eller svarte med en feil."}</p>
          <Button variant="outline" size="sm" onClick={() => q.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Prøv igjen</Button>
        </div> : !q.data ? <p className="py-12 text-center text-sm text-muted-foreground">{day === "tomorrow" ? "Morgendagens priser er ennå ikke tilgjengelige." : "Dagens priser er ikke tilgjengelige."}</p>
        : q.data.prices.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">{day === "tomorrow" ? "Ingen prisperioder mottatt for i morgen. Prisene er ennå ikke publisert." : "Ingen prisperioder i svaret for i dag."}</p> : <>
          <p className="text-xs text-muted-foreground">{formatDate(new Date(`${q.data.date}T12:00:00+01:00`))} · {q.data.count} prisperioder · Europe/Oslo</p>
          <dl className="grid gap-4 sm:grid-cols-3">{labels.map(({ label, n }) => <div key={label} className="rounded-lg border border-border p-4"><dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt><dd className="mt-1.5 text-lg font-semibold tabular">{value(n)}</dd></div>)}</dl>
          {now && <PriceChart data={q.data} now={now} />}
          <p className="text-xs text-muted-foreground">Kilde: {sources.join(", ") || "Ikke oppgitt"} · Prisområde {q.data.area}{retrieved && ` · Hentet ${formatDateTime(new Date(retrieved))}`}</p>
        </>}
      </section>
      <p className="text-xs text-muted-foreground">Alle priser vises inkl. mva. Spotpris fra API-et tillegges 25 % mva. bare når den er oppgitt ekskl. mva. Norgespris er en visuell referanse, ikke en beregning av besparelse eller faktura. Faktisk forskjell avhenger av forbruk og avtaleperiode. Nettleie, avgifter og påslag er ikke med. Gjennomsnittet gjelder tilgjengelige prisperioder.</p>
    </div>
  </>;
}