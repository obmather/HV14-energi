import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/water/AppShell";
import { LatestReading } from "@/components/water/MeterCard";
import { ConsumptionPanel } from "@/components/water/ConsumptionPanel";
import { ReadingsTable } from "@/components/water/ReadingsTable";
import { EmptyState, QueryError } from "@/components/water/status";
import { metersQuery } from "@/lib/water/queries";

export const Route = createFileRoute("/malepunkter/$meterId")({
  head: () => ({
    meta: [
      { title: "Målepunkt – HV14 Water" },
      { name: "description", content: "Detaljer, målerstand og forbrukshistorikk for et målepunkt." },
      { property: "og:title", content: "Målepunkt – HV14 Water" },
      { property: "og:description", content: "Detaljer, målerstand og forbrukshistorikk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MeterDetail,
});

function MeterDetail() {
  const { meterId } = Route.useParams();
  const q = useQuery(metersQuery());
  const meter = q.data?.find((m) => m.id === meterId);

  return (
    <>
      <Link to="/malepunkter" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Målepunkter
      </Link>
      {q.isPending ? (
        <Skeleton className="h-96" />
      ) : q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : !meter ? (
        <EmptyState>Fant ikke målepunktet</EmptyState>
      ) : (
        <>
          <PageHeader title={meter.name} subtitle={meter.location ?? undefined} />
          <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            <section className="surface space-y-4 p-5">
              <h2 className="text-sm font-semibold">Generell informasjon</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {[
                  ["Målepunkt", meter.name],
                  ["Plassering", meter.location],
                  ["Serienummer", meter.serialNumber],
                  ["Produsent", meter.manufacturer],
                  ["Modell", meter.model],
                  ["DevEUI", meter.devEui],
                ].map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className={k === "Serienummer" || k === "DevEUI" ? "font-mono" : ""}>{v ?? "–"}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="surface p-5">
              <h2 className="mb-4 text-sm font-semibold">Gjeldende status</h2>
              <LatestReading meterId={meter.id} />
            </section>
          </div>
          <section className="surface mt-6 p-5">
            <h2 className="mb-4 text-sm font-semibold">Forbrukshistorikk</h2>
            <ConsumptionPanel meterId={meter.id} />
          </section>
          <section className="surface mt-6 p-5">
            <h2 className="mb-4 text-sm font-semibold">Historiske avlesninger</h2>
            <ReadingsTable meterId={meter.id} />
          </section>
        </>
      )}
    </>
  );
}
