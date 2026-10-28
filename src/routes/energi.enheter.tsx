import { createFileRoute } from "@tanstack/react-router";
import { EnergyMeters } from "./energi.malepunkter";

export const Route = createFileRoute("/energi/enheter")({
  head: () => ({ meta: [
    { title: "Enheter – HV14 Energi" },
    { name: "description", content: "Registrerte energienheter og energimålere i HV14 Energi." },
    { property: "og:title", content: "Enheter – HV14 Energi" },
    { property: "og:description", content: "Registrerte energienheter og energimålere i HV14 Energi." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Devices,
});

function Devices() { return <EnergyMeters title="Enheter" />; }