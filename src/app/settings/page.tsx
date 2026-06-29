import Link from "next/link";
import { Activity, ChevronRight, ShieldAlert, Users } from "lucide-react";

import { AppShell } from "@/components/crm/app-nav";

const settingsLinks = [
  {
    href: "/settings/team",
    title: "Equipe",
    description: "Gerenciar equipes, usuarios e responsaveis comerciais.",
    icon: Users,
  },
  {
    href: "/settings/landing-cleanup",
    title: "Dados captados pela landing",
    description: "Excluir leads, oportunidades e cadastros criados pelos testes da landing page.",
    icon: ShieldAlert,
  },
  {
    href: "/settings/integration-health",
    title: "Saúde da integração",
    description: "Monitorar eventos, entregas e estado das integrações do CRM.",
    icon: Activity,
  },
];

export default function SettingsPage() {
  return (
    <AppShell>
      <section className="space-y-6 p-6">
        <div>
          <p className="text-sm font-medium text-primary">Configurações</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Ajustes do CRM
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Acesse as configurações administrativas e ferramentas de manutenção.
          </p>
        </div>

        <div className="grid gap-3">
          {settingsLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition hover:border-primary/60 hover:bg-accent/35"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {item.description}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground transition group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
