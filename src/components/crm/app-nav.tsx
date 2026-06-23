"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  CircleDollarSign,
  KanbanSquare,
  Package,
  Settings,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/deals", label: "Deals", icon: CircleDollarSign },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/contacts", label: "Contatos", icon: Users },
  { href: "/tasks", label: "Tarefas", icon: CalendarCheck },
  { href: "/settings/landing-products", label: "Produtos landing", icon: Package },
  { href: "/settings/team", label: "Settings", icon: Settings },
];

function NavLinks({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Button
            key={item.href}
            asChild
            size="sm"
            variant={isActive ? "secondary" : "ghost"}
            className={compact ? "shrink-0" : "w-full justify-start"}
          >
            <Link href={item.href}>
              <Icon />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="border-b px-5 py-4">
          <p className="text-sm font-medium text-muted-foreground">AI-Native</p>
          <h2 className="text-lg font-semibold tracking-tight">CRM</h2>
        </div>
        <nav className="grid gap-1 p-3">
          <NavLinks />
        </nav>
      </div>
    </aside>
  );
}

export function AppMobileNav() {
  return (
    <nav className="border-b bg-background lg:hidden">
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2">
        <NavLinks compact />
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-muted/40">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl bg-muted/40">
        <AppSidebar />
        <section className="min-w-0 flex-1">
          <AppMobileNav />
          {children}
        </section>
      </div>
    </main>
  );
}

export function AppNav() {
  return <AppMobileNav />;
}
