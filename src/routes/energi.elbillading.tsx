import { createFileRoute } from "@tanstack/react-router";
import { ChargerPanel } from "@/components/energy/ChargerPanel";

export const Route = createFileRoute("/energi/elbillading")({
  head: () => ({ meta: [
    { title: "Elbillading – HV14 Energi" },
    { name: "description", content: "Elbillading og tilkoblede ladestasjoner i HV14 Energi." },
    { property: "og:title", content: "Elbillading – HV14 Energi" },
    { property: "og:description", content: "Elbillading og tilkoblede ladestasjoner i HV14 Energi." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Charging,
});

function Charging() { return <ChargerPanel />; }