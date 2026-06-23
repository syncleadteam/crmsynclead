"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Boxes, Eye, PackagePlus, RefreshCw, Tags, Trash2 } from "lucide-react";

import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";
import { Button } from "@/components/ui/button";

type LandingCategory = "agent" | "module";

type LandingProduct = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  unit_price: number;
  is_active: boolean;
  landing_form_code: string | null;
  landing_form_category: LandingCategory | null;
  landing_form_position: number;
  landing_form_required_agents: string[];
};

type FormState = {
  name: string;
  description: string;
  sku: string;
  unit_price: string;
  is_active: boolean;
  landing_form_code: string;
  landing_form_category: LandingCategory;
  landing_form_position: string;
  landing_form_required_agents: string[];
};

const agentOptions = [
  { value: "attendance_agent", label: "Atendimento" },
  { value: "sales_agent", label: "Vendas" },
  { value: "support_agent", label: "Suporte" },
];

const initialForm: FormState = {
  name: "",
  description: "",
  sku: "",
  unit_price: "0",
  is_active: true,
  landing_form_code: "",
  landing_form_category: "module",
  landing_form_position: "100",
  landing_form_required_agents: [],
};

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function categoryLabel(category: LandingCategory | null) {
  if (category === "agent") return "Agente";
  if (category === "module") return "Modulo";
  return "-";
}

function agentLabel(code: string) {
  return agentOptions.find((agent) => agent.value === code)?.label ?? code;
}

function productTags(item: LandingProduct) {
  return [
    item.landing_form_category === "agent" ? "Agente IA" : "Modulo",
    item.is_active ? "Ativo na landing" : "Pausado",
    item.landing_form_required_agents.length > 0 ? "Com dependencia" : null,
    item.unit_price >= 300 ? "Ticket alto" : "Entrada",
  ].filter((tag): tag is string => Boolean(tag));
}

export function LandingProductsPage() {
  const [items, setItems] = useState<LandingProduct[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const grouped = useMemo(
    () => ({
      agents: items.filter((item) => item.landing_form_category === "agent"),
      modules: items.filter((item) => item.landing_form_category === "module"),
    }),
    [items],
  );
  const activeCount = items.filter((item) => item.is_active).length;
  const modulesWithDependencies = grouped.modules.filter(
    (item) => item.landing_form_required_agents.length > 0,
  ).length;

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const payload = await crmFetch<{ data: LandingProduct[] }>("/api/v1/products?landing_form=true&limit=100");
      setItems(
        payload.data.sort(
          (a, b) =>
            (a.landing_form_category === b.landing_form_category
              ? 0
              : a.landing_form_category === "agent"
                ? -1
                : 1) ||
            a.landing_form_position - b.landing_form_position ||
            a.name.localeCompare(b.name),
        ),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nao foi possivel carregar produtos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function toggleRequiredAgent(agent: string) {
    setForm((current) => ({
      ...current,
      landing_form_required_agents: current.landing_form_required_agents.includes(agent)
        ? current.landing_form_required_agents.filter((item) => item !== agent)
        : [...current.landing_form_required_agents, agent],
    }));
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await crmFetch("/api/v1/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          sku: form.sku || null,
          unit_price: Number(form.unit_price),
          is_active: form.is_active,
          landing_form_code: form.landing_form_code,
          landing_form_category: form.landing_form_category,
          landing_form_position: Number(form.landing_form_position),
          landing_form_required_agents:
            form.landing_form_category === "module" ? form.landing_form_required_agents : [],
        }),
      });
      setForm(initialForm);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nao foi possivel criar produto.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function patchItem(id: string, patch: Partial<LandingProduct>) {
    setUpdatingId(id);
    setError(null);

    try {
      await crmFetch(`/api/v1/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nao foi possivel atualizar produto.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeItem(id: string) {
    setUpdatingId(id);
    setError(null);

    try {
      await crmFetch(`/api/v1/products/${id}`, { method: "DELETE" });
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nao foi possivel remover produto.");
    } finally {
      setUpdatingId(null);
    }
  }

  function ProductTable({ title, rows }: { title: string; rows: LandingProduct[] }) {
    return (
      <section className="rounded-xl border bg-card/70">
        <header className="border-b px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Codigo</th>
                <th className="px-4 py-3 font-medium">Dependencias</th>
                <th className="px-4 py-3 font-medium">Tags</th>
                <th className="px-4 py-3 font-medium">Preco</th>
                <th className="px-4 py-3 font-medium">Ativo</th>
                <th className="px-4 py-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                    Nenhum produto configurado.
                  </td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.name}</div>
                      <div className="mt-1 max-w-md text-xs text-muted-foreground">{item.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">{item.landing_form_code}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{categoryLabel(item.landing_form_category)}</div>
                    </td>
                    <td className="px-4 py-3">
                      {item.landing_form_required_agents.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Sempre visivel</span>
                      ) : (
                        <div className="flex max-w-56 flex-wrap gap-1">
                          {item.landing_form_required_agents.map((agent) => (
                            <span key={agent} className="rounded-md border bg-background/50 px-2 py-1 text-xs">
                              {agentLabel(agent)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-56 flex-wrap gap-1">
                        {productTags(item).map((tag) => (
                          <span key={tag} className="rounded-md border bg-background/50 px-2 py-1 text-xs text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">{brl(item.unit_price)}</td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={item.is_active}
                        disabled={updatingId === item.id}
                        onChange={(event) => void patchItem(item.id, { is_active: event.target.checked })}
                        className="size-4"
                        aria-label={`Ativar ${item.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={updatingId === item.id}
                          onClick={() => {
                            const nextPrice = window.prompt("Novo preco mensal", String(item.unit_price));
                            if (nextPrice === null) return;
                            void patchItem(item.id, { unit_price: Number(nextPrice) });
                          }}
                        >
                          Preco
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={updatingId === item.id}
                          onClick={() => {
                            const nextDescription = window.prompt("Descricao comercial", item.description ?? "");
                            if (nextDescription === null) return;
                            void patchItem(item.id, { description: nextDescription });
                          }}
                        >
                          Texto
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={updatingId === item.id}
                          onClick={() => void removeItem(item.id)}
                        >
                          <Trash2 />
                          Remover
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <AppShell>
      <div className="grid w-full gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <div className="space-y-6">
          <header className="flex flex-col gap-3 rounded-xl border bg-card/70 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Catalogo da landing</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Ative, pause e precifique os agentes e modulos exibidos no formulario.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => void load(true)} disabled={isLoading}>
              <RefreshCw />
              Atualizar
            </Button>
          </header>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <section className="rounded-xl border bg-card/70 px-4 py-8 text-sm text-muted-foreground">
              Carregando...
            </section>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-card/70 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bot className="size-4 text-primary" />
                    Agentes ativos
                  </div>
                  <p className="mt-2 text-2xl font-semibold">
                    {grouped.agents.filter((item) => item.is_active).length}
                  </p>
                </div>
                <div className="rounded-xl border bg-card/70 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Boxes className="size-4 text-accent-cyan" />
                    Modulos ativos
                  </div>
                  <p className="mt-2 text-2xl font-semibold">
                    {grouped.modules.filter((item) => item.is_active).length}
                  </p>
                </div>
                <div className="rounded-xl border bg-card/70 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tags className="size-4 text-primary" />
                    Dependencias
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{modulesWithDependencies}</p>
                </div>
              </section>

              <section className="rounded-xl border bg-card/70 p-4">
                <div className="flex items-center gap-2">
                  <Eye className="size-4 text-accent-cyan" />
                  <h2 className="font-semibold">Previa da landing</h2>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {items.filter((item) => item.is_active).slice(0, 6).map((item) => (
                    <article key={item.id} className="rounded-xl border bg-background/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {item.description ?? "Sem descricao comercial."}
                          </p>
                        </div>
                        <span className="rounded-md border px-2 py-1 text-xs text-accent-cyan">
                          {categoryLabel(item.landing_form_category)}
                        </span>
                      </div>
                      <p className="mt-3 font-semibold">{brl(item.unit_price)}/mes</p>
                    </article>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {activeCount} itens ativos aparecem no formulario; itens pausados ficam ocultos para o lead.
                </p>
              </section>
              <ProductTable title="Agentes" rows={grouped.agents} />
              <ProductTable title="Modulos" rows={grouped.modules} />
            </>
          )}
        </div>

        <aside className="rounded-xl border bg-card/70 p-4">
          <h2 className="font-semibold">Novo item da landing</h2>
          <form onSubmit={createItem} className="mt-4 grid gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Nome
              <input
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.name}
                onChange={(event) => updateForm({ name: event.target.value })}
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Codigo da landing
              <input
                className="h-9 rounded-md border border-input bg-background px-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.landing_form_code}
                onChange={(event) => updateForm({ landing_form_code: event.target.value })}
                placeholder="ex: custom_module"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Categoria
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.landing_form_category}
                onChange={(event) =>
                  updateForm({ landing_form_category: event.target.value as LandingCategory })
                }
              >
                <option value="agent">Agente</option>
                <option value="module">Modulo</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Preco mensal
              <input
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="number"
                min="0"
                step="0.01"
                value={form.unit_price}
                onChange={(event) => updateForm({ unit_price: event.target.value })}
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Posicao
              <input
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="number"
                min="0"
                value={form.landing_form_position}
                onChange={(event) => updateForm({ landing_form_position: event.target.value })}
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              SKU
              <input
                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.sku}
                onChange={(event) => updateForm({ sku: event.target.value })}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Descricao
              <textarea
                className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.description}
                onChange={(event) => updateForm({ description: event.target.value })}
              />
            </label>
            {form.landing_form_category === "module" ? (
              <fieldset className="grid gap-2 rounded-md border p-3">
                <legend className="px-1 text-sm font-medium">Aparece quando houver</legend>
                {agentOptions.map((agent) => (
                  <label key={agent.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.landing_form_required_agents.includes(agent.value)}
                      onChange={() => toggleRequiredAgent(agent.value)}
                    />
                    {agent.label}
                  </label>
                ))}
              </fieldset>
            ) : null}
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => updateForm({ is_active: event.target.checked })}
              />
              Ativo no formulario
            </label>
            <Button type="submit" disabled={isSubmitting}>
              <PackagePlus />
              {isSubmitting ? "Criando" : "Criar item"}
            </Button>
          </form>
        </aside>
      </div>
    </AppShell>
  );
}
