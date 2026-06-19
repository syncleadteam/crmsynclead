"use client";

import Link from "next/link";
import { Check, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";

type Proposal = {
  id: string;
  deal_id: string;
  version: number;
  status: "draft" | "sent" | "approved";
  title: string;
  total_value: number;
  pdf_url: string | null;
  approved_at: string | null;
  created_at: string;
};

export function ProposalDetail({ id }: { id: string }) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const payload = await crmFetch<{ data: Proposal }>(`/api/v1/proposals/${id}`);
      setProposal(payload.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel carregar proposta.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  async function approve() {
    setError(null);
    try {
      const payload = await crmFetch<{ data: Proposal }>(
        `/api/v1/proposals/${id}/approve`,
        { method: "POST" },
      );
      setProposal(payload.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel aprovar proposta.",
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
      <div className="w-full px-4 py-6 lg:px-8">
        <section className="rounded-lg border bg-background">
          <header className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Button asChild size="sm" variant="link" className="h-auto px-0">
                <Link href="/proposals">Voltar</Link>
              </Button>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Detalhe da proposta
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => void load(true)}
              >
                <RefreshCw />
                Atualizar
              </Button>
              <Button
                type="button"
                disabled={!proposal || proposal.status === "approved"}
                onClick={() => void approve()}
              >
                <Check />
                Aprovar
              </Button>
            </div>
          </header>
          {error ? (
            <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <div className="grid gap-3 p-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : proposal ? (
              <>
                {Object.entries(proposal).map(([key, value]) => (
                  <div key={key} className="grid gap-1 rounded-md border p-3 md:grid-cols-[180px_minmax(0,1fr)]">
                    <dt className="text-sm font-medium text-muted-foreground">{key}</dt>
                    <dd className="break-words text-sm">{String(value ?? "-")}</dd>
                  </div>
                ))}
                {proposal.pdf_url ? (
                  <iframe
                    className="h-[640px] w-full rounded-md border"
                    src={proposal.pdf_url}
                    title="Preview da proposta"
                  />
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Proposta nao encontrada.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
