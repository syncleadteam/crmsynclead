"use client";

import Link from "next/link";
import { ArrowLeft, CalendarX, Database, FileX2, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";
import { Button } from "@/components/ui/button";

type DataSummary = {
  companies: number;
  contacts: number;
  leads: number;
  deals: number;
  tasks: number;
  activities: number;
  proposals: number;
  deal_products: number;
  integration_events: number;
  integration_event_deliveries: number;
  integrations_state: number;
  n8n_sync_events: number;
};

type CleanupScope = "landing" | "agenda" | "integration_logs" | "crm_operational";

const cleanupOptions: Array<{
  scope: CleanupScope;
  title: string;
  description: string;
  confirmation: string;
  icon: typeof Trash2;
  danger?: boolean;
}> = [
  {
    scope: "landing",
    title: "Dados captados pela landing",
    description:
      "Remove leads, oportunidades, tarefas e cadastros ligados aos envios da landing page.",
    confirmation: "Excluir dados captados pela landing page?",
    icon: FileX2,
  },
  {
    scope: "agenda",
    title: "Agenda",
    description:
      "Remove todos os compromissos e tarefas do CRM, incluindo itens sincronizados do Google Calendar.",
    confirmation: "Excluir todos os compromissos e tarefas da Agenda?",
    icon: CalendarX,
  },
  {
    scope: "integration_logs",
    title: "Registros de integração",
    description:
      "Remove eventos, entregas e estados técnicos das integrações sem apagar leads ou oportunidades.",
    confirmation: "Excluir registros técnicos de integração?",
    icon: RefreshCw,
  },
  {
    scope: "crm_operational",
    title: "Dados operacionais do CRM",
    description:
      "Zera contas, contatos, leads, oportunidades, tarefas, propostas, atividades e logs. Mantém usuários, funil, produtos e automações.",
    confirmation:
      "Esta ação zera os dados operacionais do CRM. Digite EXCLUIR para confirmar.",
    icon: Database,
    danger: true,
  },
];

function totalOperational(summary: DataSummary | null) {
  if (!summary) {
    return 0;
  }

  return (
    summary.companies +
    summary.contacts +
    summary.leads +
    summary.deals +
    summary.tasks +
    summary.activities +
    summary.proposals +
    summary.deal_products
  );
}

export default function LandingCleanupPage() {
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [activeScope, setActiveScope] = useState<CleanupScope | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const metrics = useMemo(
    () => [
      { label: "Contas", value: summary?.companies ?? 0 },
      { label: "Contatos", value: summary?.contacts ?? 0 },
      { label: "Leads", value: summary?.leads ?? 0 },
      { label: "Oportunidades", value: summary?.deals ?? 0 },
      { label: "Agenda", value: summary?.tasks ?? 0 },
      {
        label: "Integrações",
        value:
          (summary?.integration_events ?? 0) +
          (summary?.integration_event_deliveries ?? 0) +
          (summary?.integrations_state ?? 0) +
          (summary?.n8n_sync_events ?? 0),
      },
    ],
    [summary],
  );

  const loadSummary = useCallback(async () => {
    setIsLoading(true);

    try {
      const payload = await crmFetch<{ data: DataSummary }>(
        "/api/v1/admin/data-cleanup",
      );
      setSummary(payload.data);
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível carregar o resumo dos dados.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function clearData(option: (typeof cleanupOptions)[number]) {
    const confirmed = option.danger
      ? window.prompt(option.confirmation) === "EXCLUIR"
      : window.confirm(option.confirmation);

    if (!confirmed) {
      return;
    }

    setActiveScope(option.scope);
    setMessage(null);

    try {
      const payload = await crmFetch<{
        data: { after: DataSummary };
      }>("/api/v1/admin/data-cleanup", {
        method: "DELETE",
        body: JSON.stringify({ scope: option.scope }),
      });

      setSummary(payload.data.after);
      setMessage(`Limpeza concluída: ${option.title}.`);
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível concluir a limpeza solicitada.",
      );
    } finally {
      setActiveScope(null);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadSummary();
    });
  }, [loadSummary]);

  return (
    <AppShell>
      <section className="space-y-6 p-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/settings">
            <ArrowLeft />
            Configurações
          </Link>
        </Button>

        <div>
          <p className="text-sm font-medium text-primary">Administração de dados</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Dados captados pela landing page
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Ferramentas administrativas para limpar dados de teste e registros
            operacionais do CRM. As ações abaixo preservam usuários, permissões,
            funil, catálogo de produtos e automações.
          </p>
        </div>

        <section className="rounded-lg border bg-background p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-semibold">Resumo atual</h2>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadSummary()}
              disabled={isLoading}
            >
              <RefreshCw />
              Atualizar
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold">
                  {isLoading ? "..." : metric.value}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Total operacional: {isLoading ? "..." : totalOperational(summary)} registros.
          </p>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          {cleanupOptions.map((option) => {
            const Icon = option.icon;
            const isActive = activeScope === option.scope;

            return (
              <article
                key={option.scope}
                className={
                  option.danger
                    ? "rounded-lg border border-destructive/30 bg-destructive/5 p-5"
                    : "rounded-lg border bg-background p-5"
                }
              >
                <div className="flex items-start gap-4">
                  <span
                    className={
                      option.danger
                        ? "flex size-10 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive"
                        : "flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                    }
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      className={
                        option.danger
                          ? "font-semibold text-destructive"
                          : "font-semibold"
                      }
                    >
                      {option.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="mt-4"
                  variant={option.danger ? "destructive" : "outline"}
                  disabled={Boolean(activeScope)}
                  onClick={() => void clearData(option)}
                >
                  <Trash2 />
                  {isActive ? "Excluindo" : "Excluir"}
                </Button>
              </article>
            );
          })}
        </section>

        {message ? (
          <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
