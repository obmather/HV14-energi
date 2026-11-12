import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/water/AppShell";
import { HourlyConsumptionPanel } from "@/components/energy/HourlyConsumptionPanel";
import { MAIN_METER } from "@/lib/energy/data";

export const Route = createFileRoute("/energi/stromforbruk")({
  head: () => ({ meta: [
    { title: "Strømforbruk – HV14 Energi" },
    { name: "description", content: "Timebasert strømforbruk og spotkostnad fra hovedmåleren." },
    { property: "og:title", content: "Strømforbruk – HV14 Energi" },
    { property: "og:description", content: "Timebasert strømforbruk og spotkostnad fra hovedmåleren." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Consumption,
});

function Consumption() {
  return (
    <>
      <PageHeader title="Strømforbruk" subtitle={`${MAIN_METER.name} – ${MAIN_METER.location}`} />
      <HourlyConsumptionPanel />
    </>
  );
}
