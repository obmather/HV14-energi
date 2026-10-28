import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Gauge, LayoutGrid, Settings, Waves, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { DevModeBanner } from "./status";
import { EnergyDevBanner } from "@/components/energy/status";

const VANN_NAV = [
  { to: "/", label: "Oversikt", icon: LayoutGrid, exact: true },
  { to: "/malepunkter", label: "Målepunkter", icon: Gauge, exact: false },
  { to: "/historikk", label: "Historikk", icon: BarChart3, exact: false },
  { to: "/innstillinger", label: "Innstillinger", icon: Settings, exact: false },
] as const;

const ENERGI_NAV = [
  { to: "/energi", label: "Oversikt", icon: LayoutGrid, exact: true },
  { to: "/energi/malepunkter", label: "Målepunkter", icon: Gauge, exact: false },
  { to: "/energi/historikk", label: "Historikk", icon: BarChart3, exact: false },
] as const;

const linkCls =
  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground";

const moduleCls =
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-card data-[active=true]:text-foreground data-[active=true]:shadow-sm";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isEnergi = pathname === "/energi" || pathname.startsWith("/energi/");
  const nav = isEnergi ? ENERGI_NAV : VANN_NAV;
  const ModuleIcon = isEnergi ? Zap : Waves;
  return (
    <div className="min-h-screen">
      {isEnergi ? <EnergyDevBanner /> : <DevModeBanner />}
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link to={isEnergi ? "/energi" : "/"} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ModuleIcon className="h-4.5 w-4.5" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              HV14 <span className="text-teal">{isEnergi ? "Energi" : "Vann"}</span>
            </span>
          </Link>
          <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto">
            {nav.map(({ to, label, icon: Icon, exact }) => (
              <Link key={to} to={to} className={linkCls} activeOptions={{ exact }}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex gap-0.5 rounded-lg bg-muted p-0.5" aria-label="Velg modul">
            <Link to="/" className={moduleCls} data-active={!isEnergi}>
              <Waves className="h-3.5 w-3.5" /> Vann
            </Link>
            <Link to="/energi" className={moduleCls} data-active={isEnergi}>
              <Zap className="h-3.5 w-3.5" /> Energi
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string | undefined; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
