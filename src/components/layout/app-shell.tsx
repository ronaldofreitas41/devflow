"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/shared/logo";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { UserMenu } from "./user-menu";

export const SIDEBAR_COOKIE = "devflow_sidebar";

export function AppShell({
  user,
  defaultCollapsed,
  children,
}: {
  user: { name: string; email: string };
  defaultCollapsed: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      // Preferência de interface apenas — nada relacionado a autenticação.
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Pular para o conteúdo
      </a>

      {/* Sidebar — desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex",
          collapsed ? "w-[60px]" : "w-60",
        )}
      >
        <div className={cn("flex h-14 items-center", collapsed ? "justify-center" : "justify-between px-4")}>
          <Link href="/dashboard" aria-label="DevFlow — início">
            <Logo collapsed={collapsed} />
          </Link>
          {!collapsed && (
            <Tooltip content="Recolher (Ctrl/⌘ B)" side="right">
              <button onClick={toggle} aria-label="Recolher menu lateral" className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-foreground">
                <PanelLeftClose className="size-4" />
              </button>
            </Tooltip>
          )}
        </div>

        <nav aria-label="Principal" className="flex-1 px-2 py-2">
          <ul className="grid gap-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const link = (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors",
                    active ? "bg-surface-raised text-foreground" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <item.icon className={cn("size-4 shrink-0", active && "text-primary")} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip content={item.label} side="right">
                      {link}
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-2">
          {collapsed && (
            <Tooltip content="Expandir (Ctrl/⌘ B)" side="right">
              <button onClick={toggle} aria-label="Expandir menu lateral" className="mb-1 grid h-9 w-full place-items-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground">
                <PanelLeftOpen className="size-4" />
              </button>
            </Tooltip>
          )}
          <UserMenu user={user} compact={collapsed} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior — mobile */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md md:hidden">
          <Link href="/dashboard" aria-label="DevFlow — início">
            <Logo />
          </Link>
          <UserMenu user={user} compact side="bottom" />
        </header>

        <main id="conteudo" className="min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>

      {/* Navegação inferior — mobile */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <item.icon className={cn("size-5", active && "text-primary")} />
                  {item.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
