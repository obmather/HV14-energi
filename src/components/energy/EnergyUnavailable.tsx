import { PageHeader } from "@/components/water/AppShell";
import { BatteryCharging, CircleDollarSign } from "lucide-react";

export function EnergyUnavailable({ kind }: { kind: "charging" | "prices" }) {
  const charging = kind === "charging";
  const Icon = charging ? BatteryCharging : CircleDollarSign;
  return (
    <>
      <PageHeader title={charging ? "Elbillading" : "Strømpriser"} />
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{charging ? "Ingen ladedata tilgjengelig" : "Ingen strømpriser tilgjengelig"}</h2>
        <p className="text-sm text-muted-foreground">{charging ? "Ingen ladestasjoner er tilkoblet." : "Ingen priskilde er tilkoblet."}</p>
      </div>
    </>
  );
}