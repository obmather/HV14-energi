import { createFileRoute } from "@tanstack/react-router";
import { EnergyUnavailable } from "@/components/energy/EnergyUnavailable";

export const Route = createFileRoute("/energi/strompriser")({
  head: () => ({ meta: [
    { title: "Strømpriser – HV14 Energi" },
    { name: "description", content: "Strømpriser og prisgrunnlag i HV14 Energi." },
    { property: "og:title", content: "Strømpriser – HV14 Energi" },
    { property: "og:description", content: "Strømpriser og prisgrunnlag i HV14 Energi." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Prices,
});

function Prices() { return <EnergyUnavailable kind="prices" />; }