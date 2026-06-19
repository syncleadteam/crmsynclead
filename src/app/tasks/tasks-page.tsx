"use client";

import { Check, Plus, RefreshCw } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";

type Task = {
  id: string;
  title: string;
  type: "call" | "meeting" | "email" | "follow_up" | "other";
  related_entity_type: "lead" | "deal" | "contact" | "company";
  related_entity_id: string;
  due_at: string;
  status: "pending" | "completed" | "canceled";
  is_overdue: boolean;
  assignee?: { full_name: string | null; email: string } | null;
};

const taskTypes = [
  { value: "call", label: "Ligacao" },
  { value: "meeting", label: "Reuniao" },
  { value: "email", label: "Email" },
  { value: "follow_up", label: "Follow-up" },
  { value: "other", label: "Outra" },
];

const entityTypes = [
  { value: "lead", label: "Lead" },
  { value: "deal", label: "Deal" },
  { value: "contact", label: "Contato" },
  { value: "company", label: "Empresa" },
];

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("follow_up");
  const [relatedEntityType, setRelatedEntityType] = useState("deal");
  const [relatedEntityId, setRelatedEntityId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const groupedByDay = useMemo(() => {
    return tasks.reduce<Record<string, Task[]>>((groups, task) => {
      const day = new Date(task.due_at).toISOString().slice(0, 10);
      groups[day] = [...(groups[day] ?? []), task];
      return groups;
    }, {});
  }, [tasks]);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const payload = await crmFetch<{ data: Task[] }>("/api/v1/tasks");
      setTasks(payload.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel carregar tarefas.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await crmFetch("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          type,
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId,
          due_at: new Date(dueAt).toISOString(),
        }),
      });
      setTitle("");
      setRelatedEntityId("");
      setDueAt("");
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel criar tarefa.",
      );
    }
  }

  async function completeTask(task: Task) {
    const previous = tasks;
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? { ...item, status: "completed", is_overdue: false }
          : item,
      ),
    );
    setError(null);

    try {
      await crmFetch(`/api/v1/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      });
      await load();
    } catch (requestError) {
      setTasks(previous);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel concluir tarefa.",
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
      <div className="grid w-full gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <section className="rounded-lg border bg-background">
          <header className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Agenda</p>
              <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-lg border p-0.5">
                <Button
                  type="button"
                  variant={view === "list" ? "secondary" : "ghost"}
                  onClick={() => setView("list")}
                >
                  Lista
                </Button>
                <Button
                  type="button"
                  variant={view === "calendar" ? "secondary" : "ghost"}
                  onClick={() => setView("calendar")}
                >
                  Calendario
                </Button>
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
            </div>
          </header>
          {error ? (
            <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {view === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Titulo</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Vencimento</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                        Carregando...
                      </td>
                    </tr>
                  ) : tasks.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                        Nenhuma tarefa encontrada.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{task.title}</td>
                        <td className="px-4 py-3">{task.type}</td>
                        <td className="px-4 py-3">
                          {new Date(task.due_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md border px-2 py-1 text-xs">
                            {task.is_overdue ? "Atrasada" : task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={task.status !== "pending"}
                            onClick={() => void completeTask(task)}
                          >
                            <Check />
                            Concluir
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(groupedByDay).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem tarefas no calendario.</p>
              ) : (
                Object.entries(groupedByDay).map(([day, dayTasks]) => (
                  <article key={day} className="rounded-lg border p-3">
                    <h2 className="font-semibold">
                      {new Date(`${day}T00:00:00`).toLocaleDateString("pt-BR")}
                    </h2>
                    <div className="mt-3 grid gap-2">
                      {dayTasks.map((task) => (
                        <div key={task.id} className="rounded-md border p-2 text-sm">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-muted-foreground">
                            {new Date(task.due_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            - {task.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </section>

        <aside className="rounded-lg border bg-background p-4">
          <h2 className="font-semibold">Nova tarefa</h2>
          <form onSubmit={createTask} className="mt-4 grid gap-3">
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
              Tipo
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {taskTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Entidade
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={relatedEntityType}
                  onChange={(event) => setRelatedEntityType(event.target.value)}
                >
                  {entityTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                ID
                <input
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={relatedEntityId}
                  onChange={(event) => setRelatedEntityId(event.target.value)}
                  required
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium">
              Vencimento
              <input
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                required
              />
            </label>
            <Button type="submit">
              <Plus />
              Criar tarefa
            </Button>
          </form>
        </aside>
      </div>
    </AppShell>
  );
}
