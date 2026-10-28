import { Link, useRouterState } from "@tanstack/react-router";
import { Waves } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MODULES, secondaryPath } from "@/lib/navigation";
import { EnergyDevBanner } from "./status";

// Keep the original Water header's dimensions and tokens without modifying Water.
const linkCls =
  "h-auto shrink-0 px-3 py-2 text-muted-foreground data-[active=true]:bg-accent data-[active=true]:text-accent-foreground";

export function EnergyAppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activePath = secondaryPath(pathname).replace(/\/$/, "");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link to="/energi" className="flex shrink-0 items-center gap-2" aria-label="HV14 Energi">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Waves className="h-4.5 w-4.5" />
            </span>
            <span className="whitespace-nowrap text-base font-semibold tracking-tight">
              HV14 <span className="text-teal">Energi</span>
            </span>
          </Link>
          <nav aria-label="Energi – sider" className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {MODULES[1].nav.map(({ to, label, icon: Icon, exact }) => {
              const active = exact ? activePath === to : activePath === to || activePath.startsWith(`${to}/`);
              return (
                <Button key={to} variant="ghost" asChild className={linkCls}>
                  <Link to={to} activeOptions={{ exact }} data-active={active} aria-current={active ? "page" : undefined}>
                    <Icon className="h-4 w-4" />{label}
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