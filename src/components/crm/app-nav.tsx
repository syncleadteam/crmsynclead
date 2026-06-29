"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  CircleDollarSign,
  KanbanSquare,
  MessageCircleMore,
  Package,
  Settings,
  Users,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/crm/global-search";
import { crmFetch } from "@/components/crm/client-api";
import type {
  PermissionMatrix,
  PermissionModule,
} from "@/lib/auth/permissions";

const navItems: Array<{
  href: string;
  label: string;
  icon: typeof BarChart3;
  module: PermissionModule;
}> = [
  {
    href: "/dashboard",
    label: "Visão geral",
    icon: BarChart3,
    module: "dashboard",
  },
  {
    href: "/deals",
    label: "Oportunidades",
    icon: CircleDollarSign,
    module: "deals",
  },
  {
    href: "/sdr-conversations",
    label: "Conversas",
    icon: MessageCircleMore,
    module: "automations",
  },
  { href: "/companies", label: "Contas", icon: Building2, module: "companies" },
  { href: "/contacts", label: "Contatos", icon: Users, module: "contacts" },
  {
    href: "/pipeline",
    label: "Funil",
    icon: KanbanSquare,
    module: "pipelines",
  },
  { href: "/tasks", label: "Agenda", icon: CalendarCheck, module: "tasks" },
  {
    href: "/settings/landing-products",
    label: "Catálogo de Produtos",
    icon: Package,
    module: "products",
  },
  {
    href: "/whatsapp-automations",
    label: "Automações",
    icon: Workflow,
    module: "automations",
  },
  { href: "/settings", label: "Configurações", icon: Settings, module: "team" },
];

function NavLinks({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const [permissions, setPermissions] = useState<PermissionMatrix | null>(null);

  useEffect(() => {
    crmFetch<{ data: { permissions: PermissionMatrix } }>(
      "/api/v1/me/permissions",
    )
      .then((payload) => setPermissions(payload.data.permissions))
      .catch(() => setPermissions(null));
  }, []);

  return (
    <>
      {navItems
        .filter((item) => permissions?.[item.module]?.view ?? true)
        .map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Button
              key={item.href}
              asChild
              size="sm"
              variant={isActive ? "secondary" : "ghost"}
              className={
                compact
                  ? "shrink-0"
                  : "w-full justify-start text-sidebar-foreground/85 hover:text-sidebar-foreground"
              }
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
    <aside className="hidden w-72 shrink-0 border-r border-sidebar-border bg-sidebar/95 lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Image
            src="/synclead-logo.png"
            alt="SyncLead"
            width={150}
            height={57}
            priority
            className="h-auto w-36"
          />
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Operacao de automacoes
          </p>
        </div>
        <nav className="grid gap-1 p-3">
          <div className="mb-2">
            <GlobalSearch />
          </div>
          <NavLinks />
        </nav>
      </div>
    </aside>
  );
}

export function AppMobileNav() {
  return (
    <nav className="border-b border-sidebar-border bg-sidebar lg:hidden">
      <div className="flex items-center gap-3 overflow-x-auto px-4 py-3">
        <Image
          src="/synclead-logo.png"
          alt="SyncLead"
          width={112}
          height={43}
          className="h-auto w-24 shrink-0"
        />
        <GlobalSearch compact />
        <NavLinks compact />
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
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
