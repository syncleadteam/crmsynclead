"use client";

import Link from "next/link";
import { Activity, Building2, CheckCircle2, Mail, Phone, RefreshCw, Sparkles, UserRound } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/crm/app-nav";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { crmFetch } from "@/components/crm/client-api";

type Lead = {
  id: string;
  status: "new" | "contacted" | "qualified" | "disqualified" | "converted";
  score: number;
  disqualification_reason: string | null;
  converted_deal_id: string | null;
  created_at: string;
  updated_at: string;
  contact: {
    full_name: string;
    email: string | null;
    phone: string | null;
    source: string | null;
    company: { id: string; name: string; segment: string | null } | null;
  } | null;
  owner: { full_name: string | null; email: string; role: string } | null;
  converted_deal: { id: string; title: string; value: number; status: string } | null;
  activities: ActivityItem[];
};

type ActivityItem = {
  id: string;
  actor_type: "user" | "system" | "n8n";
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor: { full_name: string | null; email: string } | null;
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
  const landingActivity = lead?.activities.find(
    (activityItem) => activityItem.action === "landing_infrastructure_form_submitted",
  );
  const landingMetadata = landingActivity?.metadata ?? {};
  const selectedModules = Array.isArray(landingMetadata.modules)
    ? landingMetadata.modules as Array<{ code?: string; name?: string; price?: number }>
    : [];
  const estimatedTotal =
    typeof landingMetadata.estimated_monthly_total === "number"
      ? landingMetadata.estimated_monthly_total
      : Number(landingMetadata.estimated_monthly_total ?? 0);
  const observations =
    typeof landingMetadata.observations === "string" ? landingMetadata.observations : "";
  const agentsQuantity =
    typeof landingMetadata.agents_quantity === "string" ? landingMetadata.agents_quantity : "";
  const nextActions = [
    lead?.status === "new" ? "Fazer primeiro contato e marcar lead como contatado." : null,
    lead?.score && lead.score >= 70 ? "Priorizar atendimento: score alto para proposta de automacao." : null,
    selectedModules.length > 0 ? "Usar agentes e modulos selecionados como base da proposta." : null,
    !lead?.converted_deal_id && lead?.status === "qualified" ? "Converter lead em oportunidade." : null,
  ].filter((action): action is string => Boolean(action));

  return (
    <AppShell>
      <div className="grid w-full gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <section className="rounded-xl border bg-card/70 shadow-2xl shadow-primary/10 backdrop-blur">
          <header className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Button asChild size="sm" variant="link" className="h-auto px-0">
                <Link href="/leads">Voltar para leads</Link>
              </Button>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                {lead?.contact?.full_name ?? "Detalhe do lead"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {lead?.contact?.company?.name ?? "Lead capturado para automacao"}
              </p>
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
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border bg-background/40 p-3">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium">{lead.status}</p>
                  </div>
                  <div className="rounded-md border bg-background/40 p-3">
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className="font-medium">{lead.score}</p>
                  </div>
                  <div className="rounded-md border bg-background/40 p-3">
                    <p className="text-sm text-muted-foreground">Oportunidade convertida</p>
                    {lead.converted_deal ? (
                      <Link className="font-medium text-primary hover:underline" href={`/deals/${lead.converted_deal.id}`}>
                        {lead.converted_deal.title}
                      </Link>
                    ) : (
                      <p className="font-medium">-</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  <article className="rounded-xl border bg-background/40 p-4">
                    <div className="flex items-center gap-2">
                      <UserRound className="size-4 text-primary" />
                      <h2 className="font-semibold">Contato</h2>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Nome</dt>
                        <dd className="font-medium">{lead.contact?.full_name ?? "-"}</dd>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <dt className="flex items-center gap-1 text-muted-foreground"><Mail className="size-3" /> Email</dt>
                          <dd className="break-words">{lead.contact?.email ?? "-"}</dd>
                        </div>
                        <div>
                          <dt className="flex items-center gap-1 text-muted-foreground"><Phone className="size-3" /> Telefone</dt>
                          <dd>{lead.contact?.phone ?? "-"}</dd>
                        </div>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Origem</dt>
                        <dd>{lead.contact?.source ?? "CRM"}</dd>
                      </div>
                    </dl>
                  </article>

                  <article className="rounded-xl border bg-background/40 p-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-accent-cyan" />
                      <h2 className="font-semibold">Conta e consultor</h2>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Conta</dt>
                        <dd className="font-medium">{lead.contact?.company?.name ?? "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Segmento</dt>
                        <dd>{lead.contact?.company?.segment ?? "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Consultor</dt>
                        <dd>{lead.owner?.full_name ?? lead.owner?.email ?? "-"}</dd>
                      </div>
                    </dl>
                  </article>
                </div>

                <article className="rounded-xl border bg-background/40 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-primary" />
                        <h2 className="font-semibold">Infraestrutura solicitada</h2>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Dados capturados pelo formulario de personalizacao da landing.
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2 text-right">
                      <p className="text-xs text-muted-foreground">Estimativa mensal</p>
                      <p className="font-semibold">
                        R$ {estimatedTotal.toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="rounded-lg border bg-background/50 p-3">
                      <p className="text-sm text-muted-foreground">Quantidade de agentes</p>
                      <p className="mt-1 font-medium">{agentsQuantity || "-"}</p>
                    </div>
                    <div className="rounded-lg border bg-background/50 p-3">
                      <p className="text-sm text-muted-foreground">Observacoes</p>
                      <p className="mt-1 text-sm">{observations || "-"}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {selectedModules.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum agente ou modulo registrado na landing.</p>
                    ) : (
                      selectedModules.map((moduleItem) => (
                        <div key={moduleItem.code ?? moduleItem.name} className="rounded-lg border bg-background/50 p-3">
                          <p className="font-medium">{moduleItem.name ?? moduleItem.code}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            R$ {Number(moduleItem.price ?? 0).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </article>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <article className="rounded-xl border bg-background/40 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-accent-cyan" />
                      <h2 className="font-semibold">Proximas acoes</h2>
                    </div>
                    <ul className="mt-4 grid gap-2 text-sm text-muted-foreground">
                      {nextActions.length === 0 ? (
                        <li>Nenhuma acao sugerida para o status atual.</li>
                      ) : (
                        nextActions.map((action) => (
                          <li key={action} className="rounded-lg border bg-background/50 p-3">
                            {action}
                          </li>
                        ))
                      )}
                    </ul>
                  </article>

                  <article className="rounded-xl border bg-background/40 p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="size-4 text-primary" />
                      <h2 className="font-semibold">Timeline</h2>
                    </div>
                    <div className="mt-4">
                      <ActivityTimeline items={lead.activities} />
                    </div>
                  </article>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Lead nao encontrado.</p>
            )}
          </div>
        </section>

        <aside className="rounded-xl border bg-card/70 p-4">
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
