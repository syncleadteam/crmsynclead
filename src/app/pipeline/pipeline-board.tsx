"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";

type Stage = {
  id: string;
  name: string;
  position: number;
  probability: number;
  is_won_stage: boolean;
  is_lost_stage: boolean;
};

type Pipeline = {
  id: string;
  name: string;
  pipeline_stages: Stage[];
};

type Deal = {
  id: string;
  title: string;
  value: number;
  status: "open" | "won" | "lost";
  stage_id: string;
  pipeline_id: string;
  lost_reason: string | null;
  company: { name: string } | null;
  contact: { full_name: string } | null;
  owner: { full_name: string | null; email: string } | null;
};

export function PipelineBoard() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const selectedPipeline = useMemo(
    () => pipelines.find((pipeline) => pipeline.id === selectedPipelineId),
    [pipelines, selectedPipelineId],
  );

  const stages = useMemo(
    () =>
      [...(selectedPipeline?.pipeline_stages ?? [])].sort(
        (a, b) => a.position - b.position,
      ),
    [selectedPipeline],
  );

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const pipelinePayload = await crmFetch<{ data: Pipeline[] }>("/api/v1/pipelines");
      const nextPipelineId =
        selectedPipelineId || pipelinePayload.data[0]?.id || "";
      setPipelines(pipelinePayload.data);
      setSelectedPipelineId(nextPipelineId);

      if (nextPipelineId) {
        const dealsPayload = await crmFetch<{ data: Deal[] }>(
          `/api/v1/deals?pipeline_id=${nextPipelineId}`,
        );
        setDeals(dealsPayload.data);
      } else {
        setDeals([]);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel carregar pipeline.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedPipelineId]);

  async function moveDeal(deal: Deal, stage: Stage) {
    const lostReason = stage.is_lost_stage
      ? window.prompt("Motivo da perda")
      : undefined;

    if (stage.is_lost_stage && !lostReason) {
      return;
    }

    const previousDeals = deals;
    setDeals((current) =>
      current.map((item) =>
        item.id === deal.id
          ? {
              ...item,
              stage_id: stage.id,
              status: stage.is_won_stage
                ? "won"
                : stage.is_lost_stage
                  ? "lost"
                  : "open",
            }
          : item,
      ),
    );

    try {
      await crmFetch(`/api/v1/deals/${deal.id}/move-stage`, {
        method: "POST",
        body: JSON.stringify({
          stage_id: stage.id,
          lost_reason: lostReason,
        }),
      });
      await load();
    } catch (requestError) {
      setDeals(previousDeals);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel mover deal.",
      );
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  return (
    <AppShell>
      <div className="flex w-full flex-col gap-6 px-4 py-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Pipeline</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Kanban de deals
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selectedPipelineId}
              onChange={(event) => setSelectedPipelineId(event.target.value)}
            >
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
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

        <section className="flex gap-4 overflow-x-auto pb-3">
          {isLoading ? (
            <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              Carregando board...
            </div>
          ) : stages.length === 0 ? (
            <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              Configure etapas para visualizar o Kanban.
            </div>
          ) : (
            stages.map((stage) => {
              const stageDeals = deals.filter((deal) => deal.stage_id === stage.id);
              const total = stageDeals.reduce((sum, deal) => sum + deal.value, 0);

              return (
                <article
                  key={stage.id}
                  className="flex min-h-[520px] w-[300px] shrink-0 flex-col rounded-lg border bg-background"
                >
                  <header className="border-b p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-semibold">{stage.name}</h2>
                      <span className="rounded-md border px-2 py-1 text-xs">
                        {stageDeals.length}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      R$ {total.toLocaleString("pt-BR")}
                    </p>
                  </header>
                  <div className="grid gap-3 p-3">
                    {stageDeals.length === 0 ? (
                      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                        Sem deals nesta etapa.
                      </div>
                    ) : (
                      stageDeals.map((deal) => (
                        <div key={deal.id} className="rounded-md border p-3">
                          <Link
                            href={`/deals/${deal.id}`}
                            className="font-medium hover:underline"
                          >
                            {deal.title}
                          </Link>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {deal.company?.name ?? deal.contact?.full_name ?? "Sem conta"}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                            <span>R$ {deal.value.toLocaleString("pt-BR")}</span>
                            <span className="rounded-md border px-2 py-1 text-xs">
                              {deal.status}
                            </span>
                          </div>
                          <select
                            className="mt-3 h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={deal.stage_id}
                            onChange={(event) => {
                              const nextStage = stages.find(
                                (item) => item.id === event.target.value,
                              );
                              if (nextStage) {
                                void moveDeal(deal, nextStage);
                              }
                            }}
                          >
                            {stages.map((option) => (
                              <option key={option.id} value={option.id}>
                                Mover para {option.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </AppShell>
  );
}
