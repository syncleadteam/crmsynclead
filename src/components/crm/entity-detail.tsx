"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";

type EntityDetailProps = {
  endpoint: string;
  backHref: string;
  title: string;
};

type Payload = {
  data: Record<string, unknown>;
};

function renderValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

export function EntityDetail({ endpoint, backHref, title }: EntityDetailProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const payload = await crmFetch<Payload>(endpoint);
      setData(payload.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel carregar o detalhe.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  return (
    <AppShell>
      <div className="w-full px-4 py-6 lg:px-8">
        <section className="rounded-lg border bg-background">
          <header className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Button asChild size="sm" variant="link" className="h-auto px-0">
                <Link href={backHref}>Voltar</Link>
              </Button>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
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
          <div className="grid gap-3 p-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : data ? (
              Object.entries(data).map(([key, value]) => (
                <div key={key} className="grid gap-1 rounded-md border p-3 md:grid-cols-[180px_minmax(0,1fr)]">
                  <dt className="text-sm font-medium text-muted-foreground">{key}</dt>
                  <dd className="whitespace-pre-wrap break-words text-sm">
                    {renderValue(value)}
                  </dd>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Registro nao encontrado.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
