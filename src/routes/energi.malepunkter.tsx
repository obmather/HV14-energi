import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/water/AppShell";
import { QueryError } from "@/components/water/status";
import { EnergyMockBadge } from "@/components/energy/status";
import { energyMetersQuery } from "@/lib/energy/data";

export const Route = createFileRoute("/energi/malepunkter")({
  head: () => ({
    meta: [
      { title: "Målepunkter – HV14 Energi" },
      { name: "description", content: "Alle energimålere i HV14 Energi." },
      { property: "og:title", content: "Målepunkter – HV14 Energi" },
      { property: "og:description", content: "Alle energimålere i HV14 Energi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EnergyMeters,
});

export function EnergyMeters({ title = "Målepunkter" }: { title?: string }) {
  const q = useQuery(energyMetersQuery());
  return (
    <>
      <PageHeader title={title} subtitle="Registrerte energimålere">
        <EnergyMockBadge />
      </PageHeader>
      {q.isPending ? (
        <Skeleton className="h-40" />
      ) : q.isError ? (
        <QueryError onRetry={() => q.refetch()} />
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Navn</th>
                <th className="px-5 py-3 font-medium">Plassering</th>
                <th className="px-5 py-3 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">{m.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{m.location}</td>
                  <td className="px-5 py-3">{m.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
