import { FlaskConical } from "lucide-react";

export function EnergyDevBanner() {
  return (
    <div className="border-b border-border bg-warning-soft px-4 py-2 text-center text-sm text-warning">
      <strong className="font-semibold">Utviklingsmodus:</strong> HV14 Energi viser simulerte data – ikke reelle målinger.
    </div>
  );
}

export function EnergyMockBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
      <FlaskConical className="h-3.5 w-3.5" />
      Simulert
    </span>
  );
}
