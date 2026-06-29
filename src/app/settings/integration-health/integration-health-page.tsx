"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Route, ServerCog, Workflow } from "lucide-react";

import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StatusCounts = Record<string, number>;

type HealthPayload = {
  ok: boolean;
  checked_at: string;
  n8n: {
    ok: boolean;
    configured: boolean;
    status: number | null;
    error?: string;
  };
  crm_to_n8n: StatusCounts;
  n8n_to_crm: StatusCounts;
  recent_failures: Array<{
    id: string;
    event_type: string;
    entity_type: string;
    entity_id: string | null;
    status: string;
    last_error: string | null;
    updated_at: string;
  }>;
  recent_syncs: Array<{
    id: string;
    event_type: string;
    entity_type: string | null;
    entity_id: string | null;
    external_id: string | null;
    status: string;
    error_message: string | null;
    processed_at: string;
  }>;
};

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        ok
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      {ok ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
      {ok ? "Saudável" : "Atenção"}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  title,
  counts,
}: {
  icon: typeof Workflow;
  title: string;
  counts: StatusCounts;
}) {
  return (
    <section className="rounded-lg border bg-card/70 p-5">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-md border bg-background text-primary">
          <Icon className="size-5" />
        </div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className="rounded-md border bg-background/70 p-3">
            <dt className="text-muted-foreground">{status}</dt>
            <dd className="mt-1 text-xl font-semibold">{count}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function IntegrationHealthPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = await crmFetch<{ data: HealthPayload }>("/api/v1/integrations/health");
      setHealth(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao carregar saude da integracao.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  return (
    <AppShell>
      <div className="grid w-full gap-6 px-4 py-6 lg:px-8">
        <section className="border-b pb-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Integrações</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Saúde CRM, Supabase e N8N
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {health ? <StatusBadge ok={health.ok} /> : null}
              <Button type="button" variant="outline" disabled={isLoading} onClick={() => void load()}>
                {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                Atualizar
              </Button>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {health ? (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-card/70 p-5">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-md border bg-background text-primary">
                    <ServerCog className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">N8N API</h2>
                    <p className="text-sm text-muted-foreground">
                      {health.n8n.configured ? `HTTP ${health.n8n.status ?? "-"}` : "Nao configurado"}
                    </p>
                  </div>
                </div>
                <div className="mt-5">
                  <StatusBadge ok={health.n8n.ok} />
                </div>
              </div>
              <MetricCard icon={Route} title="CRM para N8N" counts={health.crm_to_n8n} />
              <MetricCard icon={Workflow} title="N8N para CRM" counts={health.n8n_to_crm} />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border bg-card/70 p-5">
                <h2 className="font-semibold">Falhas recentes</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-3">Evento</th>
                        <th className="py-2 pr-3">Entidade</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Erro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {health.recent_failures.length === 0 ? (
                        <tr>
                          <td className="py-4 text-muted-foreground" colSpan={4}>
                            Nenhuma falha na fila CRM para N8N.
                          </td>
                        </tr>
                      ) : (
                        health.recent_failures.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="py-3 pr-3 font-medium">{item.event_type}</td>
                            <td className="py-3 pr-3 text-muted-foreground">{item.entity_type}</td>
                            <td className="py-3 pr-3">{item.status}</td>
                            <td className="max-w-64 truncate py-3 pr-3 text-muted-foreground">
                              {item.last_error ?? "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border bg-card/70 p-5">
                <h2 className="font-semibold">Callbacks N8N recentes</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-3">Evento</th>
                        <th className="py-2 pr-3">Entidade</th>
                        <th className="py-2 pr-3">Externo</th>
                        <th className="py-2 pr-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {health.recent_syncs.length === 0 ? (
                        <tr>
                          <td className="py-4 text-muted-foreground" colSpan={4}>
                            Nenhum callback processado.
                          </td>
                        </tr>
                      ) : (
                        health.recent_syncs.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="py-3 pr-3 font-medium">{item.event_type}</td>
                            <td className="py-3 pr-3 text-muted-foreground">{item.entity_type ?? "-"}</td>
                            <td className="max-w-44 truncate py-3 pr-3 text-muted-foreground">
                              {item.external_id ?? "-"}
                            </td>
                            <td className="py-3 pr-3">{item.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        ) : isLoading ? (
          <div className="grid min-h-72 place-items-center rounded-lg border bg-card/70 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
