import { Link, useRouterState } from "@tanstack/react-router";
import { Waves } from "lucide-react";
import type { ReactNode } from "react";
import { DevModeBanner } from "./status";
import { EnergyDevBanner } from "@/components/energy/status";
import { Button } from "@/components/ui/button";
import { MODULES, moduleForPath, secondaryPath } from "@/lib/navigation";
import { APP_MODE } from "@/lib/app-mode";

const linkCls =
  "shrink-0 text-muted-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const selectedModule = APP_MODE === "preview" ? moduleForPath(pathname) : MODULES[APP_MODE === "energy" ? 1 : 0];
  const activePath = secondaryPath(pathname);
  const isEnergi = selectedModule.id === "energy";
  return (
    <div className="min-h-screen">
      {isEnergi ? <EnergyDevBanner /> : <DevModeBanner />}
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
          <Link to={selectedModule.to} aria-label="HV14" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Waves className="h-4.5 w-4.5" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              HV14
            </span>
          </Link>
          <nav aria-label="Moduler" className="flex min-w-0 gap-1 overflow-x-auto">
            {MODULES.map(({ id, to, label, icon: Icon }) => (
              <Button key={id} variant="ghost" asChild className={linkCls}>
                {APP_MODE !== "preview" && selectedModule.id !== id ? (
                  <a href={id === "water" ? "/vann/" : "/energi/"}><Icon />{label}</a>
                ) : (
                  <Link to={to} data-active={selectedModule.id === id} aria-current={selectedModule.id === id ? "true" : undefined}>
                    <Icon />{label}
                  </Link>
                )}
              </Button>
            ))}
          </nav>
        </div>
        <div className="border-t border-border">
          <nav aria-label={`${selectedModule.label} – sider`} className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
            {selectedModule.nav.map(({ to, label, icon: Icon, exact }) => {
              const active = exact ? activePath.replace(/\/$/, "") === to.replace(/\/$/, "") : activePath === to || activePath.startsWith(`${to}/`);
              return (
                <Button key={to} variant="ghost" asChild className={linkCls}>
                  <Link to={to} activeOptions={{ exact }} data-active={active} aria-current={active ? "page" : undefined}>
                    <Icon />{label}
                  </Link>
                </Button>
              );
            })}
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
