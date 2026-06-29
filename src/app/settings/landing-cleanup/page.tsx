"use client";

import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";
import { Button } from "@/components/ui/button";

export default function LandingCleanupPage() {
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function clearLandingData() {
    const confirmed = window.confirm(
      "Excluir leads, oportunidades e cadastros orfaos captados pela landing page?",
    );

    if (!confirmed) {
      return;
    }

    setIsClearing(true);
    setMessage(null);

    try {
      const payload = await crmFetch<{
        data: { leads: number; deals: number; contacts: number; companies: number };
      }>("/api/v1/landing/test-data", {
        method: "DELETE",
      });

      setMessage(
        `Exclusão concluída: ${payload.data.leads} leads, ${payload.data.deals} oportunidades, ${payload.data.contacts} contatos e ${payload.data.companies} contas.`,
      );
    } catch (requestError) {
      setMessage(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível excluir os dados da landing.",
      );
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <AppShell>
      <section className="space-y-6 p-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/settings">
            <ArrowLeft />
            Configurações
          </Link>
        </Button>

        <div>
          <p className="text-sm font-medium text-primary">Dados da landing</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Exclusão de dados captados
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Remove dados criados pelo formulário da landing page durante testes:
            leads, oportunidades, tarefas, atividades e cadastros órfãos ligados
            a esses registros.
          </p>
        </div>

        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-destructive">
                Excluir dados captados pela landing
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Esta ação é voltada para limpeza de testes e pede confirmação no
                navegador antes de executar. Apenas administradores podem
                concluir a exclusão.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void clearLandingData()}
              disabled={isClearing}
            >
              <Trash2 />
              {isClearing ? "Excluindo" : "Excluir dados"}
            </Button>
          </div>

          {message ? (
            <p className="mt-4 text-sm text-muted-foreground">{message}</p>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
