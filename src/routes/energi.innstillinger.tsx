import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/water/AppShell";
import { ENERGY_API_BASE } from "@/lib/app-mode";

export const Route = createFileRoute("/energi/innstillinger")({
  head: () => ({ meta: [
    { title: "Innstillinger – HV14 Energi" },
    { name: "description", content: "Gjeldende konfigurasjon for HV14 Energi." },
    { property: "og:title", content: "Innstillinger – HV14 Energi" },
    { property: "og:description", content: "Gjeldende konfigurasjon for HV14 Energi." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: EnergySettings,
});

function EnergySettings() {
  const rows = [
    ["Elbillading", "HV14 Energi API"],
    ["API-adresse", ENERGY_API_BASE],
    ["Andre energidata", "Simulerte data"],
    ["Tidssone", "Europe/Oslo"],
  ];
  return (
    <>
      <PageHeader title="Innstillinger" />
      <section className="surface max-w-2xl p-5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}