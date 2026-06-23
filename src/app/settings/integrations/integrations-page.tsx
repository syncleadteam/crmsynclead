"use client";

import { CheckCircle2, Copy, ExternalLink, KeyRound, RefreshCw, Route, ShieldCheck, Workflow } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";

type IntegrationState = {
  id: string;
  provider: string;
  entity_type: string;
  entity_id: string;
  external_id: string | null;
  status: string;
  last_synced_at: string | null;
  updated_at: string;
};

const callbackEndpoints = [
  {
    title: "Pontuar lead",
    method: "POST",
    path: "/api/v1/leads/{lead_id}/score",
    description: "Atualiza a nota do lead e registra a automacao no historico.",
    body: `{
  "score": 82,
  "provider": "n8n",
  "status": "scored",
  "metadata": {
    "origem": "qualificacao_ia",
    "motivo": "alto encaixe com automacao comercial"
  }
}`,
  },
  {
    title: "Registrar atividade",
    method: "POST",
    path: "/api/v1/activities",
    description: "Grava uma acao executada pelo n8n na linha do tempo do CRM.",
    body: `{
  "entity_type": "lead",
  "entity_id": "uuid-do-lead",
  "action": "whatsapp_enviado",
  "metadata": {
    "template": "primeiro_contato",
    "canal": "whatsapp"
  }
}`,
  },
  {
    title: "Sincronizar agenda",
    method: "POST",
    path: "/api/v1/tasks/{task_id}/calendar-sync",
    description: "Salva o ID do evento externo em uma tarefa do CRM.",
    body: `{
  "external_calendar_event_id": "evento-google-calendar",
  "provider": "google_calendar",
  "status": "synced",
  "metadata": {
    "workflow": "agenda_comercial"
  }
}`,
  },
];

const outboundEndpoints = [
  { method: "GET", path: "/api/v1/leads", use: "buscar leads para qualificar" },
  { method: "GET", path: "/api/v1/deals", use: "ler oportunidades em andamento" },
  { method: "POST", path: "/api/v1/tasks", use: "criar tarefas para o time" },
  { method: "POST", path: "/api/v1/proposals", use: "gerar propostas para oportunidades" },
];

export function IntegrationsPage() {
  const [items, setItems] = useState<IntegrationState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const baseUrl = typeof window === "undefined" ? "https://crm-sync-lead.vercel.app" : window.location.origin;

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const payload = await crmFetch<{ data: IntegrationState[] }>(
        "/api/v1/integrations-state",
      );
      setItems(payload.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel carregar integracoes.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedValue(value);
    window.setTimeout(() => setCopiedValue(null), 1600);
  }

  return (
    <AppShell>
      <div className="grid w-full gap-6 px-4 py-6 lg:px-8">
        <section className="overflow-hidden rounded-xl border bg-card/70 shadow-2xl shadow-primary/10 backdrop-blur">
          <header className="border-b px-4 py-5 md:px-6">
            <p className="text-sm font-medium text-primary">Automacoes</p>
            <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Conexao com n8n
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Use esta sessao para conectar workflows do n8n ao CRM da SyncLead, automatizando qualificacao, atividades, agenda e tarefas comerciais.
                </p>
              </div>
              <Button asChild variant="outline">
                <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/" target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Docs HTTP Request
                </a>
              </Button>
            </div>
          </header>

          <div className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
            <article className="rounded-xl border bg-background/40 p-4">
              <KeyRound className="mb-4 text-primary" />
              <h2 className="font-semibold">Credencial</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Crie uma credencial no n8n com header de autorizacao para callbacks.
              </p>
              <code className="mt-4 block rounded-md border bg-background/70 p-3 text-xs text-muted-foreground">
                Authorization: Bearer {"{{ N8N_CALLBACK_TOKEN }}"}
              </code>
            </article>
            <article className="rounded-xl border bg-background/40 p-4">
              <Route className="mb-4 text-accent-cyan" />
              <h2 className="font-semibold">Base URL</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Use o dominio de producao do CRM em todos os nodes HTTP Request.
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-md border bg-background/70 p-2">
                <code className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{baseUrl}</code>
                <Button type="button" size="icon-sm" variant="ghost" onClick={() => void copyText(baseUrl)} aria-label="Copiar base URL">
                  {copiedValue === baseUrl ? <CheckCircle2 /> : <Copy />}
                </Button>
              </div>
            </article>
            <article className="rounded-xl border bg-background/40 p-4">
              <ShieldCheck className="mb-4 text-primary" />
              <h2 className="font-semibold">Seguranca</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Configure `N8N_CALLBACK_TOKEN` no CRM e nunca envie service role ou senhas para workflows externos.
              </p>
              <code className="mt-4 block rounded-md border bg-background/70 p-3 text-xs text-muted-foreground">
                Vercel Project Settings / Environment Variables
              </code>
            </article>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-xl border bg-card/70 p-4 md:p-6">
            <div className="flex items-center gap-3">
              <Workflow className="text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">Passo a passo</p>
                <h2 className="text-xl font-semibold">Workflow recomendado</h2>
              </div>
            </div>
            <ol className="mt-5 grid gap-4 text-sm text-muted-foreground">
              <li className="rounded-lg border bg-background/40 p-3">
                <strong className="block text-foreground">1. Crie o workflow no n8n</strong>
                Use um Webhook Trigger para receber eventos externos ou um Schedule Trigger para rotinas de prospeccao, qualificacao e acompanhamento.
              </li>
              <li className="rounded-lg border bg-background/40 p-3">
                <strong className="block text-foreground">2. Adicione um HTTP Request</strong>
                Selecione o metodo do endpoint, informe a URL do CRM e ative `Send Headers` e `Send Body` quando enviar JSON.
              </li>
              <li className="rounded-lg border bg-background/40 p-3">
                <strong className="block text-foreground">3. Configure o header</strong>
                Para callbacks do n8n, envie `Authorization: Bearer seu-token`. O CRM compara esse valor com `N8N_CALLBACK_TOKEN`.
              </li>
              <li className="rounded-lg border bg-background/40 p-3">
                <strong className="block text-foreground">4. Teste antes de ativar</strong>
                No n8n, use a URL de teste do Webhook durante a montagem. Depois de validar o fluxo, ative o workflow e use a URL de producao.
              </li>
              <li className="rounded-lg border bg-background/40 p-3">
                <strong className="block text-foreground">5. Monitore no CRM</strong>
                Cada callback pode registrar estado em integracoes e atividade na linha do tempo, facilitando auditoria e suporte.
              </li>
            </ol>
          </div>

          <div className="rounded-xl border bg-card/70 p-4 md:p-6">
            <p className="text-sm font-medium text-primary">Endpoints prontos</p>
            <h2 className="text-xl font-semibold">Callbacks do n8n para o CRM</h2>
            <div className="mt-5 grid gap-4">
              {callbackEndpoints.map((endpoint) => {
                const url = `${baseUrl}${endpoint.path}`;
                return (
                  <article key={endpoint.path} className="rounded-lg border bg-background/40 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md border px-2 py-1 text-xs font-medium text-accent-cyan">{endpoint.method}</span>
                          <h3 className="font-semibold">{endpoint.title}</h3>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{endpoint.description}</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => void copyText(url)}>
                        {copiedValue === url ? <CheckCircle2 /> : <Copy />}
                        Copiar URL
                      </Button>
                    </div>
                    <code className="mt-3 block overflow-x-auto rounded-md border bg-background/70 p-3 text-xs text-muted-foreground">
                      {url}
                    </code>
                    <pre className="mt-3 overflow-x-auto rounded-md border bg-background/70 p-3 text-xs text-muted-foreground">
                      {endpoint.body}
                    </pre>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card/70">
          <header className="border-b px-4 py-4 md:px-6">
            <p className="text-sm font-medium text-primary">CRM como fonte de dados</p>
            <h2 className="text-xl font-semibold">Chamadas autenticadas a partir do n8n</h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Para ler ou criar registros usando as APIs principais do CRM, envie um token de usuario do Supabase no header `Authorization: Bearer`. Use esse caminho quando a automacao precisar atuar como um operador autenticado.
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Metodo</th>
                  <th className="px-4 py-3 font-medium">Endpoint</th>
                  <th className="px-4 py-3 font-medium">Uso</th>
                </tr>
              </thead>
              <tbody>
                {outboundEndpoints.map((endpoint) => (
                  <tr key={`${endpoint.method}-${endpoint.path}`} className="border-b last:border-0">
                    <td className="px-4 py-3 text-accent-cyan">{endpoint.method}</td>
                    <td className="px-4 py-3">
                      <code className="rounded-md border bg-background/60 px-2 py-1 text-xs">{endpoint.path}</code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{endpoint.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border bg-card/70">
          <header className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Configuracao</p>
              <h1 className="text-2xl font-semibold tracking-tight">
                Estado das automacoes
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Entidade</th>
                  <th className="px-4 py-3 font-medium">ID externo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ultima sync</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                      Carregando...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                      Nenhum estado de integracao registrado.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{item.provider}</td>
                      <td className="px-4 py-3">
                        {item.entity_type} / {item.entity_id}
                      </td>
                      <td className="px-4 py-3">{item.external_id ?? "-"}</td>
                      <td className="px-4 py-3">{item.status}</td>
                      <td className="px-4 py-3">
                        {item.last_synced_at
                          ? new Date(item.last_synced_at).toLocaleString("pt-BR")
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
