import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/water/AppShell";
import { ConsumptionPanel } from "@/components/water/ConsumptionPanel";
import { ReadingsTable } from "@/components/water/ReadingsTable";
import { EmptyState, MockBadge, QueryError } from "@/components/water/status";
import { metersQuery } from "@/lib/water/queries";

export const Route = createFileRoute("/historikk")({
  head: () => ({
    meta: [
      { title: "Historikk – HV14 Water" },
      { name: "description", content: "Historiske målerstander og vannforbruk per time og døgn." },
      { property: "og:title", content: "Historikk – HV14 Water" },
      { property: "og:description", content: "Historiske målerstander og vannforbruk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: History,
});

function History() {
  const q = useQuery(metersQuery());
  const [selected, setSelected] = useState<string | null>(null);
  const meterId = selected ?? q.data?.[0]?.id ?? null;

  return (
    <>
      <PageHeader title="Historikk" subtitle="Vannforbruk og avlesninger over tid">
        {q.data && q.data.length > 0 && (
          <Select value={meterId ?? ""} onValueChange={setSelected}>
            <SelectTrigger className="w-64 bg-card">
              <SelectValue placeholder="Velg målepunkt" />
            </SelectTrigger>
            <SelectContent>
              {q.data.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </PageHeader>
      {q.isPending ? (
        <Skeleton className="h-96" />
      ) : q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : !meterId ? (
        <EmptyState>Ingen registrerte målepunkter</EmptyState>
      ) : (
        <div className="space-y-6">
          <section className="surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-sm font-semibold">Vannforbruk</h2>
              <MockBadge />
            </div>
            <ConsumptionPanel key={meterId} meterId={meterId} />
          </section>
          <section className="surface p-5">
            <h2 className="mb-4 text-sm font-semibold">Avlesninger</h2>
            <ReadingsTable key={meterId} meterId={meterId} />
          </section>
        </div>
      )}
    </>
  );
}
