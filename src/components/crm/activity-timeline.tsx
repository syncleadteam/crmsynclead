"use client";

import { Bot, CalendarClock, CheckCircle2, CircleDot, FileText, MessageSquare, Sparkles, UserRound } from "lucide-react";

type ActivityItem = {
  id: string;
  actor_type: "user" | "system" | "n8n";
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: { full_name: string | null; email: string } | null;
};

const actionLabels: Record<string, string> = {
  landing_infrastructure_form_submitted: "Formulario da landing recebido",
  lead_scored: "Lead pontuado",
  lead_converted: "Lead convertido",
  created_from_lead: "Oportunidade criada a partir do lead",
  stage_changed: "Etapa alterada",
  task_completed: "Tarefa concluida",
  whatsapp_enviado: "WhatsApp enviado",
  approve_proposal: "Proposta aprovada",
};

function activityIcon(action: string, actorType: ActivityItem["actor_type"]) {
  if (actorType === "n8n") return Bot;
  if (action.includes("proposal")) return FileText;
  if (action.includes("task")) return CalendarClock;
  if (action.includes("scored") || action.includes("landing")) return Sparkles;
  if (action.includes("converted") || action.includes("completed")) return CheckCircle2;
  if (action.includes("whatsapp") || action.includes("message")) return MessageSquare;
  if (actorType === "user") return UserRound;
  return CircleDot;
}

function actorLabel(activity: ActivityItem) {
  if (activity.actor?.full_name) return activity.actor.full_name;
  if (activity.actor?.email) return activity.actor.email;
  if (activity.actor_type === "n8n") return "Automacao n8n";
  if (activity.actor_type === "system") return "Sistema SyncLead";
  return "Usuario";
}

function metadataSummary(metadata: Record<string, unknown>) {
  const source = typeof metadata.source === "string" ? metadata.source : null;
  const score = typeof metadata.score === "number" ? `score ${metadata.score}` : null;
  const total =
    typeof metadata.estimated_monthly_total === "number"
      ? `estimativa R$ ${metadata.estimated_monthly_total.toLocaleString("pt-BR")}`
      : null;
  const modules = Array.isArray(metadata.modules) ? `${metadata.modules.length} itens selecionados` : null;

  return [source, score, total, modules].filter(Boolean).join(" · ");
}

export function ActivityTimeline({
  items,
  emptyText = "Nenhuma atividade registrada.",
}: {
  items: ActivityItem[];
  emptyText?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ol className="relative grid gap-4 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-border">
      {items.map((activity) => {
        const Icon = activityIcon(activity.action, activity.actor_type);
        const summary = metadataSummary(activity.metadata);

        return (
          <li key={activity.id} className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3">
            <span className="relative z-10 flex size-8 items-center justify-center rounded-full border bg-card text-primary">
              <Icon className="size-4" />
            </span>
            <div className="rounded-xl border bg-background/50 p-3">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <p className="font-medium">{actionLabels[activity.action] ?? activity.action}</p>
                <time className="text-xs text-muted-foreground">
                  {new Date(activity.created_at).toLocaleString("pt-BR")}
                </time>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{actorLabel(activity)}</p>
              {summary ? (
                <p className="mt-2 rounded-md border bg-background/60 px-2 py-1 text-xs text-muted-foreground">
                  {summary}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

