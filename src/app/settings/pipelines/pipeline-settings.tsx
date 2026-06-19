"use client";

import { Plus, RefreshCw } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";

type PipelineStage = {
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
  description: string | null;
  is_active: boolean;
  pipeline_stages: PipelineStage[];
};

export function PipelineSettings() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineName, setPipelineName] = useState("");
  const [pipelineDescription, setPipelineDescription] = useState("");
  const [stagePipelineId, setStagePipelineId] = useState("");
  const [stageName, setStageName] = useState("");
  const [stagePosition, setStagePosition] = useState("0");
  const [stageProbability, setStageProbability] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load(showLoading = false) {
    if (showLoading) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const payload = await crmFetch<{ data: Pipeline[] }>("/api/v1/pipelines");
      setPipelines(payload.data);
      setStagePipelineId((current) => current || payload.data[0]?.id || "");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel carregar pipelines.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function createPipeline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await crmFetch("/api/v1/pipelines", {
        method: "POST",
        body: JSON.stringify({
          name: pipelineName,
          description: pipelineDescription || null,
        }),
      });
      setPipelineName("");
      setPipelineDescription("");
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel criar pipeline.",
      );
    }
  }

  async function createStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stagePipelineId) {
      setError("Selecione um pipeline para criar a etapa.");
      return;
    }

    setError(null);

    try {
      await crmFetch(`/api/v1/pipelines/${stagePipelineId}/stages`, {
        method: "POST",
        body: JSON.stringify({
          name: stageName,
          position: Number(stagePosition),
          probability: Number(stageProbability),
        }),
      });
      setStageName("");
      setStagePosition("0");
      setStageProbability("0");
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel criar etapa.",
      );
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, []);

  return (
    <AppShell>
      <div className="grid w-full gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <section className="rounded-lg border bg-background">
          <header className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Settings</p>
              <h1 className="text-2xl font-semibold tracking-tight">
                Pipelines e etapas
              </h1>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void load(true)}
              disabled={isLoading}
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
          <div className="divide-y">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
            ) : pipelines.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nenhum pipeline configurado.
              </p>
            ) : (
              pipelines.map((pipeline) => (
                <article key={pipeline.id} className="p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="font-semibold">{pipeline.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {pipeline.description ?? "Sem descricao"}
                      </p>
                    </div>
                    <span className="w-fit rounded-md border px-2 py-1 text-xs">
                      {pipeline.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Ordem</th>
                          <th className="px-3 py-2 font-medium">Etapa</th>
                          <th className="px-3 py-2 font-medium">Prob.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...pipeline.pipeline_stages]
                          .sort((a, b) => a.position - b.position)
                          .map((stage) => (
                            <tr key={stage.id} className="border-b last:border-0">
                              <td className="px-3 py-2">{stage.position}</td>
                              <td className="px-3 py-2">{stage.name}</td>
                              <td className="px-3 py-2">{stage.probability}%</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="grid gap-4">
          <form onSubmit={createPipeline} className="rounded-lg border bg-background p-4">
            <h2 className="font-semibold">Novo pipeline</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Nome
                <input
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={pipelineName}
                  onChange={(event) => setPipelineName(event.target.value)}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Descricao
                <input
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={pipelineDescription}
                  onChange={(event) => setPipelineDescription(event.target.value)}
                />
              </label>
              <Button type="submit">
                <Plus />
                Criar pipeline
              </Button>
            </div>
          </form>

          <form onSubmit={createStage} className="rounded-lg border bg-background p-4">
            <h2 className="font-semibold">Nova etapa</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Pipeline
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={stagePipelineId}
                  onChange={(event) => setStagePipelineId(event.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  {pipelines.map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Nome
                <input
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={stageName}
                  onChange={(event) => setStageName(event.target.value)}
                  required
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-sm font-medium">
                  Ordem
                  <input
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    type="number"
                    min={0}
                    value={stagePosition}
                    onChange={(event) => setStagePosition(event.target.value)}
                    required
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Prob.
                  <input
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    type="number"
                    min={0}
                    max={100}
                    value={stageProbability}
                    onChange={(event) => setStageProbability(event.target.value)}
                    required
                  />
                </label>
              </div>
              <Button type="submit">
                <Plus />
                Criar etapa
              </Button>
            </div>
          </form>
        </aside>
      </div>
    </AppShell>
  );
}
