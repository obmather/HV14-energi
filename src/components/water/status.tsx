import { AlertTriangle, CircleCheck, CircleSlash, FlaskConical, RefreshCw } from "lucide-react";
import { cva } from "class-variance-authority";
import { Button } from "@/components/ui/button";
import { DATA_MODE } from "@/lib/water/config";
import { FRESHNESS_LABEL } from "@/lib/water/freshness";
import type { FreshnessState } from "@/lib/water/types";
import { cn } from "@/lib/utils";

const pill = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      state: {
        updated: "bg-success-soft text-success",
        delayed: "bg-warning-soft text-warning",
        unavailable: "bg-destructive-soft text-destructive",
        mock: "bg-warning-soft text-warning",
      },
    },
  },
);

export function FreshnessBadge({ state }: { state: FreshnessState }) {
  const Icon = state === "updated" ? CircleCheck : state === "delayed" ? AlertTriangle : CircleSlash;
  return (
    <span className={pill({ state })}>
      <Icon className="h-3.5 w-3.5" />
      {FRESHNESS_LABEL[state]}
    </span>
  );
}

export function MockBadge({ className }: { className?: string }) {
  if (DATA_MODE !== "mock") return null;
  return (
    <span className={cn(pill({ state: "mock" }), className)}>
      <FlaskConical className="h-3.5 w-3.5" />
      Simulert
    </span>
  );
}

export function DevModeBanner() {
  if (DATA_MODE !== "mock") return null;
  return (
    <div className="border-b border-border bg-warning-soft px-4 py-2 text-center text-sm text-warning">
      <strong className="font-semibold">Utviklingsmodus:</strong> Viser simulerte data – ikke reelle
      målinger. Sett <code className="font-mono">VITE_HV14_DATA_MODE=api</code> for å bruke HV14-API-et.
    </div>
  );
}

export function QueryError({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg bg-destructive-soft px-4 py-6 text-center text-sm text-destructive",
        className,
      )}
    >
      <p>Kunne ikke hente måledata. Prøv igjen.</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Prøv igjen
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ children = "Ingen tilgjengelige målinger" }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center rounded-lg bg-muted px-4 py-8 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
