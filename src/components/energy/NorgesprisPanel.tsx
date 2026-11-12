import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatNumber } from "@/lib/water/format";
import { hourStatusLabel, provisionalTotals, norgesprisErrorMessage, norgesprisMonthQuery, norgesprisSummaryQuery } from "@/lib/energy/norgespris-client";

const DASH = "—";
const kr = (n: number | null) => (n == null ? DASH : `${formatNumber(n, 2)} kr`);
const STATUS: Record<string, string> = { complete: "Komplett", incomplete: "Datagrunnlag ufullstendig", verified: "Verifisert", missing: "Mangler data", incomplete_month_history: "Ufullstendig månedshistorikk" };
const label = (s: string) => STATUS[s] ?? s;
const signedKr = (n: number | null) => (n == null ? DASH : `${n > 0 ? "+" : ""}${formatNumber(n, 2)} kr`);
const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", dateStyle: "medium" }).format(new Date(iso)) : "Ikke oppgitt");

function ErrorBox({ error, retry }: { error: unknown; retry: () => void }) {
  return <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
    <p className="text-sm">{norgesprisErrorMessage(error)}</p>
    <Button variant="outline" size="sm" onClick={retry}><RefreshCw className="mr-2 h-4 w-4" />Prøv igjen</Button>
  </div>;
}

export function NorgesprisPanel() {
  const [month, setMonth] = useState("");
  useEffect(() => { setMonth(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo", year: "numeric", month: "2-digit" }).format(new Date())); }, []);
  const summary = useQuery({ ...norgesprisSummaryQuery(month), enabled: !!month });
  const hours = useQuery({ ...norgesprisMonthQuery(month), enabled: !!month });
  const s = summary.data;
  const complete = s?.status === "complete";
  const prov = hours.data ? provisionalTotals(hours.data.hours) : null;
  return <section className="surface space-y-5 p-5 sm:p-6" aria-labelledby="norgespris-title">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="norgespris-title" className="text-lg font-semibold">Norgespris – avtale og justering</h2>
      <label className="flex items-center gap-2 text-sm">Måned
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
      </label>
    </header>
    {summary.isPending ? <Skeleton className="h-32" /> : summary.isError ? <ErrorBox error={summary.error} retry={() => summary.refetch()} />
      : !s ? <p className="py-8 text-center text-sm text-muted-foreground">Ingen Norgespris-data tilgjengelig for valgt måned.</p> : <>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-4"><dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Fastpris</dt>
          <dd className="mt-1.5 text-lg font-semibold tabular">{s.agreement?.fixedPriceNokKwhExVat == null ? DASH : `${formatNumber(s.agreement.fixedPriceNokKwhExVat, 2)} kr/kWh`}</dd><p className="text-xs text-muted-foreground">Eks. mva.</p></div>
        <div className="rounded-lg border border-border p-4"><dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Månedstak</dt>
          <dd className="mt-1.5 text-lg font-semibold tabular">{s.agreement?.monthlyCapKwh == null ? DASH : `${formatNumber(s.agreement.monthlyCapKwh, 0)} kWh`}</dd></div>
        <div className="rounded-lg border border-border p-4"><dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Gyldighet</dt>
          <dd className="mt-1.5 text-sm font-semibold">{s.agreement ? <>{date(s.agreement.validFrom)} – {s.agreement.validTo ? date(s.agreement.validTo) : "løpende"}</> : "Ingen avtale"}</dd></div>
      </dl>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4"><dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Datastatus</dt>
          <dd className={`mt-1.5 text-lg font-semibold ${complete ? "" : "text-warning"}`}>{label(s.status)}</dd>
          <p className="text-xs text-muted-foreground">Antall timer: {s.totalHours == null ? DASH : formatNumber(s.totalHours, 0)} · Verifiserte timer: {s.verifiedHours == null ? DASH : formatNumber(s.verifiedHours, 0)}</p></div>
        <div className="rounded-lg border border-border p-4"><dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Norgesprisjustering</dt>
          <dd className="mt-1.5 text-lg font-semibold tabular">{complete && s.adjustmentNokExVat != null ? kr(s.adjustmentNokExVat) : DASH}</dd>
          <p className="text-xs text-muted-foreground">Eks. mva. · justering for valgt måned, ikke total besparelse på strømregningen</p></div>
      </dl>
    </>}
    {!complete && prov && prov.calculatedHours > 0 && <div className="rounded-lg border border-border p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Foreløpig Norgespris-justering denne måneden</h3>
      <dl className="mt-3 grid gap-4 sm:grid-cols-4">
        <div><dt className="text-xs text-muted-foreground">Samlet justering</dt><dd className="mt-1 text-lg font-semibold tabular">{signedKr(prov.adjustmentNokExVat)}</dd><p className="text-xs text-muted-foreground">Eks. mva. · Foreløpig</p></div>
        <div><dt className="text-xs text-muted-foreground">Dokumentert forbruk</dt><dd className="mt-1 text-lg font-semibold tabular">{prov.kwh == null ? DASH : `${formatNumber(prov.kwh, 2)} kWh`}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Timer med beregnet beløp</dt><dd className="mt-1 text-lg font-semibold tabular">{formatNumber(prov.calculatedHours, 0)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Timer uten tilstrekkelige data</dt><dd className="mt-1 text-lg font-semibold tabular">{formatNumber(prov.missingHours, 0)}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-warning">Foreløpig beregning – ikke et verifisert månedsoppgjør.</p>
    </div>}
    <details className="border-t border-border pt-4">
      <summary className="cursor-pointer text-sm font-medium">Timeoversikt</summary>
      <div className="mt-3">{hours.isPending ? <Skeleton className="h-24" /> : hours.isError ? <ErrorBox error={hours.error} retry={() => hours.refetch()} />
        : !hours.data || hours.data.hours.length === 0 ? <p className="text-sm text-muted-foreground">Ingen timer i svaret.</p> : <>
        {s && s.status !== "complete" && <p className="mb-2 text-sm text-warning">Datagrunnlag ufullstendig</p>}
        <div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm">
          <thead><tr className="border-b border-border text-muted-foreground"><th className="py-2 font-medium">Time (Oslo)</th><th className="py-2 text-right font-medium">Kvalifisert kWh</th><th className="py-2 text-right font-medium">Justering kr eks. mva.</th><th className="py-2 pl-3 font-medium">Status</th></tr></thead>
          <tbody>{hours.data.hours.map((h) => <tr key={h.startIso} className="border-b border-border">
            <td className="py-2 pr-3">{formatDateTime(new Date(h.startIso))}</td>
            <td className="py-2 text-right tabular">{h.eligibleKwh == null ? DASH : formatNumber(h.eligibleKwh, 3)}</td>
            <td className="py-2 text-right tabular">{h.adjustmentNokExVat == null ? DASH : <>{formatNumber(h.adjustmentNokExVat, 2)}{!complete && <span className="ml-1 text-xs text-warning">Foreløpig</span>}</>}</td>
            <td className="py-2 pl-3">{hourStatusLabel(h.status, h.adjustmentNokExVat != null)}</td></tr>)}</tbody></table></div></>}</div>
    </details>
    <p className="text-xs text-muted-foreground">Alle beløp i denne seksjonen er eksklusive merverdiavgift og hentes direkte fra Norgespris-tjenesten. Måler: Aidon hovedmåler · Prisområde NO2.</p>
  </section>;
}
