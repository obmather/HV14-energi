import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/water/AppShell";
import { MeterCard } from "@/components/water/MeterCard";
import { EmptyState, QueryError } from "@/components/water/status";
import { metersQuery } from "@/lib/water/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Oversikt – HV14 Water" },
      { name: "description", content: "Oversikt over målepunkter, målerstand og vannforbruk i HV14 Water." },
      { property: "og:title", content: "Oversikt – HV14 Water" },
      { property: "og:description", content: "Oversikt over målepunkter, målerstand og vannforbruk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const q = useQuery(metersQuery());
  return (
    <>
      <PageHeader title="Oversikt" subtitle="Siste målerstand og vannforbruk for alle målepunkter" />
      {q.isPending ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[560px]" />
          <Skeleton className="h-[560px]" />
        </div>
      ) : q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState>Ingen registrerte målepunkter</EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {q.data.map((m) => (
            <MeterCard key={m.id} meter={m} />
          ))}
        </div>
      )}
    </>
  );
}
