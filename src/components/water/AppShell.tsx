import { Link } from "@tanstack/react-router";
import { BarChart3, Gauge, LayoutGrid, Settings, Waves } from "lucide-react";
import type { ReactNode } from "react";
import { DevModeBanner } from "./status";

const NAV = [
  { to: "/", label: "Oversikt", icon: LayoutGrid, exact: true },
  { to: "/malepunkter", label: "Målepunkter", icon: Gauge, exact: false },
  { to: "/historikk", label: "Historikk", icon: BarChart3, exact: false },
  { to: "/innstillinger", label: "Innstillinger", icon: Settings, exact: false },
] as const;

const linkCls =
  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <DevModeBanner />
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Waves className="h-4.5 w-4.5" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              HV14 <span className="text-teal">Water</span>
            </span>
          </Link>
          <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto">
            {NAV.map(({ to, label, icon: Icon, exact }) => (
              <Link key={to} to={to} className={linkCls} activeOptions={{ exact }}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
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
