"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";

type Lead = {
  id: string;
  status: "new" | "contacted" | "qualified" | "disqualified" | "converted";
  score: number;
  converted_deal_id: string | null;
  contact: { full_name: string; email: string | null } | null;
};

type Pipeline = {
  id: string;
  name: string;
  pipeline_stages: Array<{ id: string; name: string; position: number }>;
};

export function LeadDetail({ id }: { id: string }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineId, setPipelineId] = useState("");
  const [stageId, setStageId] = useState("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const [leadPayload, pipelinePayload] = await Promise.all([
        crmFetch<{ data: Lead }>(`/api/v1/leads/${id}`),
        crmFetch<{ data: Pipeline[] }>("/api/v1/pipelines"),
      ]);
      setLead(leadPayload.data);
      setPipelines(pipelinePayload.data);
      setTitle((current) => current || `Negociacao - ${leadPayload.data.contact?.full_name ?? "Lead"}`);
      const firstPipelineId = pipelineId || pipelinePayload.data[0]?.id || "";
      const firstStageId =
        stageId ||
        pipelinePayload.data
          .find((pipeline) => pipeline.id === firstPipelineId)
          ?.pipeline_stages.sort((a, b) => a.position - b.position)[0]?.id ||
        "";
      setPipelineId(firstPipelineId);
      setStageId(firstStageId);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel carregar lead.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, pipelineId, stageId]);

  async function convertLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const payload = await crmFetch<{ data: { id: string } }>(
        `/api/v1/leads/${id}/convert`,
        {
          method: "POST",
          body: JSON.stringify({
            title,
            pipeline_id: pipelineId,
            stage_id: stageId,
            value: Number(value),
          }),
        },
      );
      window.location.href = `/deals/${payload.data.id}`;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel converter lead.",
      );
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const selectedPipeline = pipelines.find((pipeline) => pipeline.id === pipelineId);
  const stages = [...(selectedPipeline?.pipeline_stages ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <AppShell>
      <div className="grid w-full gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <section className="rounded-lg border bg-background">
          <header className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Button asChild size="sm" variant="link" className="h-auto px-0">
                <Link href="/leads">Voltar</Link>
              </Button>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Detalhe do lead
              </h1>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => void load(true)}
            >
              <RefreshCw />
              Atualizar
            </Button>
          </header>
          {error ? (
            <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <div className="grid gap-3 p-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : lead ? (
              <>
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Contato</p>
                  <p className="font-medium">{lead.contact?.full_name ?? "-"}</p>
                  <p className="text-sm text-muted-foreground">
                    {lead.contact?.email ?? "-"}
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border p-3">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium">{lead.status}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className="font-medium">{lead.score}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-sm text-muted-foreground">Oportunidade convertida</p>
                    <p className="font-medium">{lead.converted_deal_id ?? "-"}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Lead nao encontrado.</p>
            )}
          </div>
        </section>

        <aside className="rounded-lg border bg-background p-4">
          <h2 className="font-semibold">Converter em oportunidade</h2>
          {lead?.status !== "qualified" ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Conversao disponivel apenas para leads qualificados.
            </p>
          ) : (
            <form onSubmit={convertLead} className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Titulo
                <input
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Funil
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={pipelineId}
                  onChange={(event) => {
                    const nextPipeline = pipelines.find(
                      (pipeline) => pipeline.id === event.target.value,
                    );
                    setPipelineId(event.target.value);
                    setStageId(
                      nextPipeline?.pipeline_stages.sort(
                        (a, b) => a.position - b.position,
                      )[0]?.id ?? "",
                    );
                  }}
                  required
                >
                  {pipelines.map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Etapa inicial
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={stageId}
                  onChange={(event) => setStageId(event.target.value)}
                  required
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Valor estimado
                <input
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  type="number"
                  min={0}
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                />
              </label>
              <Button type="submit">Converter</Button>
            </form>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
