import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/water/AppShell";
import { API_BASE_URL, DATA_MODE, FRESHNESS_THRESHOLD_HOURS } from "@/lib/water/config";

export const Route = createFileRoute("/innstillinger")({
  head: () => ({
    meta: [
      { title: "Innstillinger – HV14 Water" },
      { name: "description", content: "Gjeldende konfigurasjon for HV14 Water." },
      { property: "og:title", content: "Innstillinger – HV14 Water" },
      { property: "og:description", content: "Gjeldende konfigurasjon for HV14 Water." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const rows: [string, string][] = [
    ["Datakilde", DATA_MODE === "api" ? "HV14 API" : "Utviklingsmodus (simulerte data)"],
    ["API-adresse", DATA_MODE === "api" ? API_BASE_URL || "Samme opprinnelse" : "–"],
    ["Forsinket etter", `${FRESHNESS_THRESHOLD_HOURS} timer uten ny avlesning`],
    ["Tidssone", "Europe/Oslo"],
  ];
  return (
    <>
      <PageHeader title="Innstillinger" subtitle="Konfigurasjon settes i driftsmiljøet. Flere innstillinger kommer senere." />
      <section className="surface max-w-2xl p-5">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
