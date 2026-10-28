import { createFileRoute } from "@tanstack/react-router";
import { EnergyHistory } from "./energi.historikk";

export const Route = createFileRoute("/energi/stromforbruk")({
  head: () => ({ meta: [
    { title: "Strømforbruk – HV14 Energi" },
    { name: "description", content: "Strømforbruk over tid per energimåler i HV14 Energi." },
    { property: "og:title", content: "Strømforbruk – HV14 Energi" },
    { property: "og:description", content: "Strømforbruk over tid per energimåler i HV14 Energi." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Consumption,
});

function Consumption() { return <EnergyHistory title="Strømforbruk" />; }