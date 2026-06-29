"use client";

import {
  Bot,
  CheckCircle2,
  Loader2,
  MessageCircleMore,
  PauseCircle,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type N8nChatMessage = {
  id: number;
  created_at: string | null;
  phone: string | null;
  nomewpp: string | null;
  bot_message: string | null;
  user_message: string | null;
  message_type: string | null;
  active: boolean | null;
};

type N8nChatHistory = {
  id: number;
  session_id: string | null;
  message: {
    type?: string;
    content?: string;
  } | null;
};

type Conversation = {
  phone: string;
  display_phone: string;
  name: string | null;
  setor: string | null;
  atendimento_ia: boolean | null;
  pausado_em: string | null;
  client_created_at: string | null;
  chat_created_at: string | null;
  last_activity_at: string | null;
  message_count: number;
  inbound_count: number;
  outbound_count: number;
  last_user_message: string | null;
  last_bot_message: string | null;
  messages: N8nChatMessage[];
  histories: N8nChatHistory[];
};

type ConversationsPayload = {
  data: {
    conversations: Conversation[];
    stats: {
      total: number;
      paused: number;
      active_ai: number;
      messages: number;
    };
  };
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function preview(value: string | null) {
  if (!value) {
    return "Sem mensagem registrada";
  }

  return value.length > 120 ? `${value.slice(0, 117)}...` : value;
}

function aiStatus(conversation: Conversation | null) {
  if (!conversation) {
    return { label: "Sem conversa", className: "border-border bg-muted text-muted-foreground" };
  }

  if (conversation.atendimento_ia === false || conversation.pausado_em) {
    return {
      label: "IA pausada",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    };
  }

  return {
    label: "IA ativa",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  };
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border bg-card/70 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MessageBubble({
  type,
  text,
  time,
}: {
  type: "human" | "ai";
  text: string;
  time?: string | null;
}) {
  const isAi = type === "ai";

  return (
    <div className={cn("flex gap-2", isAi ? "justify-start" : "justify-end")}>
      {isAi ? (
        <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
          <Bot className="size-4" />
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[78%] rounded-lg border px-3 py-2 text-sm leading-6",
          isAi
            ? "bg-secondary/70 text-secondary-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{text}</p>
        {time ? (
          <p className={cn("mt-1 text-[11px]", isAi ? "text-muted-foreground" : "text-primary-foreground/70")}>
            {formatDate(time)}
          </p>
        ) : null}
      </div>
      {!isAi ? (
        <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <UserRound className="size-4" />
        </span>
      ) : null}
    </div>
  );
}

export function SdrConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<ConversationsPayload["data"]["stats"]>({
    total: 0,
    paused: 0,
    active_ai: 0,
    messages: 0,
  });
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.phone === selectedPhone) ?? conversations[0] ?? null,
    [conversations, selectedPhone],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const payload = await crmFetch<ConversationsPayload>(
        `/api/v1/sdr-conversations${params.size ? `?${params}` : ""}`,
      );

      setConversations(payload.data.conversations);
      setStats(payload.data.stats);
      setSelectedPhone((current) => {
        if (current && payload.data.conversations.some((item) => item.phone === current)) {
          return current;
        }

        return payload.data.conversations[0]?.phone ?? null;
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Nao foi possivel carregar conversas.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [load]);

  async function updateAiStatus(nextStatus: boolean) {
    if (!selectedConversation) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      await crmFetch("/api/v1/sdr-conversations", {
        method: "PATCH",
        body: JSON.stringify({
          phone: selectedConversation.phone,
          atendimento_ia: nextStatus,
          setor: selectedConversation.setor,
        }),
      });
      await load();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Nao foi possivel atualizar atendimento.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  const status = aiStatus(selectedConversation);

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-accent">SDR Automatizado</p>
            <h1 className="mt-1 text-2xl font-semibold">Conversas</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Atendimento operacional das conversas processadas pelo fluxo SDR no n8n.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Atualizar
          </Button>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Conversas" value={stats.total} />
          <Stat label="IA ativa" value={stats.active_ai} />
          <Stat label="IA pausada" value={stats.paused} />
          <Stat label="Mensagens" value={stats.messages} />
        </section>

        {error ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="mt-5 grid min-h-[680px] gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="rounded-lg border bg-card/70">
            <div className="border-b p-3">
              <label className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3 text-sm">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome, telefone ou mensagem"
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </label>
            </div>

            <div className="max-h-[620px] overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Carregando conversas
                </div>
              ) : null}

              {!isLoading && conversations.length === 0 ? (
                <div className="px-3 py-12 text-center text-sm text-muted-foreground">
                  Nenhuma conversa encontrada.
                </div>
              ) : null}

              {conversations.map((conversation) => {
                const active = selectedConversation?.phone === conversation.phone;
                const conversationStatus = aiStatus(conversation);

                return (
                  <button
                    key={conversation.phone}
                    type="button"
                    onClick={() => setSelectedPhone(conversation.phone)}
                    className={cn(
                      "mb-2 w-full rounded-lg border px-3 py-3 text-left transition hover:bg-muted/70",
                      active ? "border-accent bg-accent/10" : "bg-background/60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {conversation.name ?? conversation.display_phone}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {conversation.display_phone}
                        </p>
                      </div>
                      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px]", conversationStatus.className)}>
                        {conversationStatus.label}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {preview(conversation.last_user_message ?? conversation.last_bot_message)}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{conversation.message_count} mensagens</span>
                      <span>{formatDate(conversation.last_activity_at)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <article className="rounded-lg border bg-card/70">
            {selectedConversation ? (
              <>
                <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <MessageCircleMore className="size-5 text-accent" />
                      <h2 className="truncate text-lg font-semibold">
                        {selectedConversation.name ?? selectedConversation.display_phone}
                      </h2>
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs", status.className)}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedConversation.phone}
                      {selectedConversation.setor ? ` | ${selectedConversation.setor}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void updateAiStatus(false)}
                      disabled={isUpdating || selectedConversation.atendimento_ia === false}
                    >
                      {isUpdating ? <Loader2 className="animate-spin" /> : <PauseCircle />}
                      Pausar IA
                    </Button>
                    <Button
                      onClick={() => void updateAiStatus(true)}
                      disabled={isUpdating || (selectedConversation.atendimento_ia !== false && !selectedConversation.pausado_em)}
                    >
                      {isUpdating ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                      Reativar IA
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 border-b p-4 md:grid-cols-4">
                  <Stat label="Entrada" value={selectedConversation.inbound_count} />
                  <Stat label="Resposta IA" value={selectedConversation.outbound_count} />
                  <Stat label="Última atividade" value={formatDate(selectedConversation.last_activity_at)} />
                  <Stat label="Cadastro" value={formatDate(selectedConversation.client_created_at)} />
                </div>

                <div className="grid gap-4 p-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
                  <section>
                    <h3 className="mb-3 text-sm font-semibold">Mensagens registradas</h3>
                    <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-lg border bg-background/60 p-3">
                      {selectedConversation.messages.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                          Nenhuma mensagem em `n8n_chat_messages`.
                        </p>
                      ) : null}

                      {selectedConversation.messages.map((message) => (
                        <div key={message.id} className="space-y-2">
                          {message.user_message ? (
                            <MessageBubble
                              type="human"
                              text={message.user_message}
                              time={message.created_at}
                            />
                          ) : null}
                          {message.bot_message ? (
                            <MessageBubble
                              type="ai"
                              text={message.bot_message}
                              time={message.created_at}
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-3 text-sm font-semibold">Histórico LangChain</h3>
                    <div className="max-h-[520px] overflow-y-auto rounded-lg border bg-background/60">
                      {selectedConversation.histories.length === 0 ? (
                        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                          Nenhum registro em `n8n_chat_histories`.
                        </p>
                      ) : null}

                      {selectedConversation.histories.map((history) => (
                        <div key={history.id} className="border-b px-3 py-3 last:border-b-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {history.message?.type ?? "registro"} #{history.id}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">
                            {history.message?.content ?? "Sem conteúdo"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </>
            ) : (
              <div className="flex min-h-[480px] items-center justify-center text-sm text-muted-foreground">
                Selecione uma conversa para administrar.
              </div>
            )}
          </article>
        </section>
      </div>
    </AppShell>
  );
}
