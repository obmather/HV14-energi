import { createFileRoute } from "@tanstack/react-router";
import { SpotPricesPanel } from "@/components/energy/SpotPricesPanel";
import { NorgesprisPanel } from "@/components/energy/NorgesprisPanel";

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

function Prices() { return <><SpotPricesPanel /><div className="mt-6"><NorgesprisPanel /></div></>; }