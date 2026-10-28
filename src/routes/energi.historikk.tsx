import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/water/AppShell";
import { MAIN_METER } from "@/lib/energy/data";

export const Route = createFileRoute("/energi/historikk")({
  head: () => ({
    meta: [
      { title: "Historikk – HV14 Energi" },
      { name: "description", content: "Historisk strømforbruk fra hovedmåleren." },
      { property: "og:title", content: "Historikk – HV14 Energi" },
      { property: "og:description", content: "Historisk strømforbruk fra hovedmåleren." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EnergyHistory,
});

/** No simulated history: shows an empty state until the main meter is connected. */
export function EnergyHistory({ title = "Historikk" }: { title?: string }) {
  return (
    <>
      <PageHeader title={title} subtitle={`${MAIN_METER.name} – ${MAIN_METER.location}`} />
      <section className="surface flex h-72 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <BarChart3 className="h-6 w-6" />
        <p className="font-medium text-foreground">Venter på måledata</p>
        <p>Historiske målinger blir tilgjengelige når hovedmåleren er tilkoblet.</p>
      </section>
    </>
  );
}
