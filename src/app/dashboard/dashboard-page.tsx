"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";

type PipelineSummary = {
  metrics: {
    open_deals: number;
    total_pipeline_value: number;
    average_ticket: number;
    win_rate: number;
    leads_created: number;
    leads_qualified: number;
    leads_converted: number;
  };
  by_stage: Array<{
    stage_id: string;
    stage_name: string;
    count: number;
    value: number;
  }>;
  recent_activities: Array<{
    id: string;
    entity_type: string;
    action: string;
    created_at: string;
  }>;
  leads_by_source: Array<{ source: string; count: number }>;
  top_products: Array<{ name: string; count: number; value: number; source: string }>;
  conversion: {
    leads: number;
    qualified: number;
    opportunities: number;
    proposals: number;
    won: number;
    landing_to_qualified_rate: number;
    lead_to_opportunity_rate: number;
    proposal_to_win_rate: number;
  };
};

type Forecast = Array<{ month: string; count: number; value: number }>;
type Performance = Array<{
  owner_id: string;
  owner_name: string;
  won_count: number;
  open_count: number;
  won_value: number;
}>;

function currency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

export function DashboardPage() {
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [forecast, setForecast] = useState<Forecast>([]);
  const [performance, setPerformance] = useState<Performance>([]);
  const [days, setDays] = useState("30");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [summaryPayload, forecastPayload, performancePayload] =
        await Promise.all([
          crmFetch<{ data: PipelineSummary }>(
            `/api/v1/reports/pipeline-summary?days=${days}`,
          ),
          crmFetch<{ data: Forecast }>("/api/v1/reports/forecast"),
          crmFetch<{ data: Performance }>(
            `/api/v1/reports/sales-performance?days=${days}`,
          ),
        ]);

      setSummary(summaryPayload.data);
      setForecast(forecastPayload.data);
      setPerformance(performancePayload.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel carregar dashboard.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const maxStageValue = Math.max(
    ...(summary?.by_stage.map((stage) => stage.value) ?? [0]),
    1,
  );
  const maxSourceCount = Math.max(...(summary?.leads_by_source.map((item) => item.count) ?? [0]), 1);
  const conversionSteps = summary
    ? [
        ["Leads", summary.conversion.leads],
        ["Qualificados", summary.conversion.qualified],
        ["Oportunidades", summary.conversion.opportunities],
        ["Propostas", summary.conversion.proposals],
        ["Ganhos", summary.conversion.won],
      ]
    : [];
  const maxConversion = Math.max(...conversionSteps.map(([, value]) => Number(value)), 1);

  return (
    <AppShell>
      <div className="flex w-full flex-col gap-6 px-4 py-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Visao geral</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Performance das automacoes
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={days}
              onChange={(event) => setDays(event.target.value)}
            >
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="90">90 dias</option>
            </select>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => void load(true)}
            >
              <RefreshCw />
              Atualizar
            </Button>
          </div>
        </header>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Oportunidades abertas", summary?.metrics.open_deals ?? 0],
            ["Valor no funil", currency(summary?.metrics.total_pipeline_value ?? 0)],
            ["Ticket medio", currency(summary?.metrics.average_ticket ?? 0)],
            ["Taxa de ganho", `${Math.round((summary?.metrics.win_rate ?? 0) * 100)}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-card/70 p-4 shadow-[0_20px_70px_-50px_var(--primary)]">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-xl border bg-card/70">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Funil por etapa</h2>
            </div>
            <div className="grid gap-3 p-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : summary?.by_stage.length ? (
                summary.by_stage.map((stage) => (
                  <div key={stage.stage_id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{stage.stage_name}</span>
                      <span>{stage.count} - {currency(stage.value)}</span>
                    </div>
                    <div className="h-2 rounded bg-muted">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{
                          width: `${Math.max((stage.value / maxStageValue) * 100, 4)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sem oportunidades no funil.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card/70">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Previsao de receita</h2>
            </div>
            <div className="divide-y">
              {forecast.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Sem forecast.</p>
              ) : (
                forecast.map((item) => (
                  <div key={item.month} className="flex justify-between p-4 text-sm">
                    <span>{item.month}</span>
                    <span>{item.count} - {currency(item.value)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-xl border bg-card/70">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Conversao comercial</h2>
            </div>
            <div className="grid gap-3 p-4">
              {conversionSteps.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados de conversao.</p>
              ) : (
                conversionSteps.map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                    <div className="h-2 rounded bg-muted">
                      <div
                        className="h-2 rounded bg-accent-cyan"
                        style={{ width: `${Math.max((Number(value) / maxConversion) * 100, 4)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
              <div className="mt-2 grid gap-2 text-xs text-muted-foreground">
                <span>Lead para oportunidade: {Math.round((summary?.conversion.lead_to_opportunity_rate ?? 0) * 100)}%</span>
                <span>Proposta para ganho: {Math.round((summary?.conversion.proposal_to_win_rate ?? 0) * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card/70">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Leads por origem</h2>
            </div>
            <div className="grid gap-3 p-4">
              {(summary?.leads_by_source ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem origem registrada.</p>
              ) : (
                summary?.leads_by_source.map((source) => (
                  <div key={source.source}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{source.source}</span>
                      <span>{source.count}</span>
                    </div>
                    <div className="h-2 rounded bg-muted">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{ width: `${Math.max((source.count / maxSourceCount) * 100, 4)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card/70">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Produtos mais solicitados</h2>
            </div>
            <div className="divide-y">
              {(summary?.top_products ?? []).length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Sem produtos solicitados.</p>
              ) : (
                summary?.top_products.map((product) => (
                  <div key={`${product.source}-${product.name}`} className="p-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium">{product.name}</span>
                      <span>{product.count}x</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {product.source} - {currency(product.value)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border bg-card/70">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Performance por consultor</h2>
            </div>
            <div className="divide-y">
              {performance.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Sem dados.</p>
              ) : (
                performance.map((item) => (
                  <div key={item.owner_id} className="p-4 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{item.owner_name}</span>
                      <span>{currency(item.won_value)}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {item.won_count} ganhos - {item.open_count} abertos
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card/70">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Atividades recentes</h2>
            </div>
            <div className="divide-y">
              {(summary?.recent_activities ?? []).length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Sem atividades recentes.</p>
              ) : (
                summary?.recent_activities.map((activity) => (
                  <div key={activity.id} className="p-4 text-sm">
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-muted-foreground">
                      {activity.entity_type} -{" "}
                      {new Date(activity.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
