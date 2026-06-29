"use client";

import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";

type EntityKind = "companies" | "contacts" | "leads" | "deals" | "products" | "proposals";

type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "select";
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
};

type EntityListProps = {
  kind: EntityKind;
  title: string;
  description: string;
  fields: Field[];
  columns: Array<{ key: string; label: string; render?: (item: LooseRecord) => string }>;
  headerActions?: ReactNode;
  refreshToken?: number;
};

type LooseRecord = Record<string, unknown> & { id: string };

function valueAt(item: LooseRecord, key: string) {
  return key.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }

    return undefined;
  }, item);
}

export function EntityList({
  kind,
  title,
  description,
  fields,
  columns,
  headerActions,
  refreshToken,
}: EntityListProps) {
  const [items, setItems] = useState<LooseRecord[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const endpoint = `/api/v1/${kind}`;
  const detailBase = `/${kind}`;
  const visibleItems = useMemo(() => items, [items]);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const payload = await crmFetch<{ data: LooseRecord[] }>(endpoint);
      setItems(payload.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel carregar dados.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const body = Object.fromEntries(
      Object.entries(form)
        .filter(([, value]) => value !== "")
        .map(([key, value]) => [
          key,
          key === "score" || key === "value" || key === "unit_price" || key === "total_value"
            ? Number(value)
            : value,
        ]),
    );

    try {
      await crmFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setForm({});
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel criar registro.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load, refreshToken]);

  return (
    <AppShell>
      <div className="grid w-full gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <section className="rounded-xl border bg-card/70 shadow-[0_20px_70px_-55px_var(--primary)]">
          <header className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {headerActions}
              <Button
                type="button"
                variant="outline"
                onClick={() => void load(true)}
                disabled={isLoading}
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className="px-4 py-3 font-medium">
                      {column.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={columns.length + 1}>
                      Carregando...
                    </td>
                  </tr>
                ) : visibleItems.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={columns.length + 1}>
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  visibleItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      {columns.map((column) => (
                        <td key={column.key} className="px-4 py-3">
                          {column.render
                            ? column.render(item)
                            : String(valueAt(item, column.key) ?? "-")}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`${detailBase}/${item.id}`}>Abrir</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-xl border bg-card/70 p-4 shadow-[0_20px_70px_-55px_var(--primary)]">
          <h2 className="font-semibold">Novo item</h2>
          <form onSubmit={createItem} className="mt-4 grid gap-3">
            {fields.map((field) => (
              <label key={field.name} className="grid gap-1.5 text-sm font-medium">
                {field.label}
                {field.type === "select" ? (
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form[field.name] ?? ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                    required={field.required}
                  >
                    <option value="">Selecione</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    type={field.type ?? "text"}
                    value={form[field.name] ?? ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                      }))
                    }
                    required={field.required}
                  />
                )}
              </label>
            ))}
            <Button type="submit" disabled={isSubmitting}>
              <Plus />
              {isSubmitting ? "Criando" : "Adicionar"}
            </Button>
          </form>
        </aside>
      </div>
    </AppShell>
  );
}
