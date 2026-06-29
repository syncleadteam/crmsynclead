"use client";

import {
  ExternalLink,
  ChartNoAxesColumnIncreasing,
  Loader2,
  Megaphone,
  MessageSquare,
  MessagesSquare,
  PlugZap,
  QrCode,
  RefreshCw,
  Send,
  Unplug,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/crm/app-nav";
import { crmFetch } from "@/components/crm/client-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

type WhatsappConnection = {
  id: string;
  automation_id: string;
  instance_id: string;
  instance_name: string;
  phone_number: string | null;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
};

type AutomationCard = {
  id: string;
  name: string;
  description: string;
  icon: string;
  workflow_id: string;
  workflow_url: string | null;
  webhook_url: string | null;
  active: boolean;
  connection: WhatsappConnection | null;
};

type QrPayload = {
  code: string | null;
  base64: string | null;
  pairingCode: string | null;
} | null;

type ConnectResponse = {
  data: {
    connection: WhatsappConnection;
    qrcode: QrPayload;
  };
};

type StatusResponse = ConnectResponse;

type ActivateResponse = {
  data: {
    connection: WhatsappConnection | null;
    qrcode: QrPayload;
    activated: boolean;
    needsConnection: boolean;
  };
};

const iconMap = {
  "chart-no-axes-column-increasing": ChartNoAxesColumnIncreasing,
  megaphone: Megaphone,
  "messages-square": MessagesSquare,
  send: Send,
  "refresh-cw": RefreshCw,
  workflow: Workflow,
};

function AutomationIcon({ name }: { name: string }) {
  const Icon = iconMap[name as keyof typeof iconMap] ?? MessageSquare;

  return <Icon className="size-5" />;
}

function statusLabel(status: ConnectionStatus | undefined) {
  if (status === "connected") {
    return "Conectado";
  }

  if (status === "connecting") {
    return "Aguardando QR";
  }

  if (status === "error") {
    return "Erro";
  }

  return "Desconectado";
}

function statusClass(status: ConnectionStatus | undefined) {
  if (status === "connected") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (status === "connecting") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (status === "error") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  return "border-border bg-muted/60 text-muted-foreground";
}

export function WhatsappAutomationsPage() {
  const [automations, setAutomations] = useState<AutomationCard[]>([]);
  const [activeAutomation, setActiveAutomation] = useState<AutomationCard | null>(null);
  const [qrcode, setQrcode] = useState<QrPayload>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAutomationId, setBusyAutomationId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const primaryAutomation = automations[0] ?? null;
  const sharedConnection = automations.find((item) => item.connection)?.connection ?? null;

  const modalConnection = useMemo(() => {
    if (!activeAutomation) {
      return null;
    }

    return sharedConnection;
  }, [activeAutomation, sharedConnection]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const payload = await crmFetch<{ data: AutomationCard[] }>(
        "/api/v1/whatsapp-automations",
      );
      setAutomations(payload.data);
    } catch (error) {
      showToast(
        "error",
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar automacoes.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    queueMicrotask(() => {
      void load(true);
    });
  }, [load]);

  useEffect(() => {
    if (!activeAutomation || modalConnection?.status !== "connecting") {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const payload = await crmFetch<StatusResponse>(
          `/api/v1/whatsapp-automations/${activeAutomation.id}/status`,
        );

        setAutomations((current) =>
          current.map((automation) => ({
            ...automation,
            connection: payload.data.connection,
          })),
        );

        if (payload.data.connection?.status === "connected") {
          setActiveAutomation(null);
          setQrcode(null);
          showToast("success", "WhatsApp conectado e automacao ativada.");
        }
      } catch (error) {
        showToast(
          "error",
          error instanceof Error
            ? error.message
            : "Nao foi possivel verificar a conexao.",
        );
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [activeAutomation, modalConnection?.status, showToast]);

  async function connect(automation: AutomationCard) {
    setBusyAutomationId(automation.id);

    try {
      const payload = await crmFetch<ConnectResponse>(
        `/api/v1/whatsapp-automations/${automation.id}/connect`,
        { method: "POST" },
      );

      setAutomations((current) =>
        current.map((item) => ({ ...item, connection: payload.data.connection })),
      );
      setActiveAutomation(automation);
      setQrcode(payload.data.qrcode);
      showToast("success", "Instancia criada. Escaneie o QR Code.");
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Nao foi possivel conectar.",
      );
    } finally {
      setBusyAutomationId(null);
    }
  }

  async function activate(automation: AutomationCard) {
    if (sharedConnection?.status !== "connected") {
      await connect(automation);
      return;
    }

    setBusyAutomationId(automation.id);

    try {
      const payload = await crmFetch<ActivateResponse>(
        `/api/v1/whatsapp-automations/${automation.id}/activate`,
        { method: "POST" },
      );

      if (payload.data.connection) {
        setAutomations((current) =>
          current.map((item) => ({ ...item, connection: payload.data.connection })),
        );
      }

      showToast("success", "Automacao ativada.");
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Nao foi possivel ativar.",
      );
    } finally {
      setBusyAutomationId(null);
    }
  }

  async function refreshQrCode() {
    if (!activeAutomation) {
      return;
    }

    setBusyAutomationId(activeAutomation.id);

    try {
      const payload = await crmFetch<ConnectResponse>(
        `/api/v1/whatsapp-automations/${activeAutomation.id}/qrcode`,
      );
      setQrcode(payload.data.qrcode);
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Nao foi possivel atualizar QR Code.",
      );
    } finally {
      setBusyAutomationId(null);
    }
  }

  async function disconnect(automation: AutomationCard) {
    setBusyAutomationId(automation.id);

    try {
      const payload = await crmFetch<{ data: WhatsappConnection | null }>(
        `/api/v1/whatsapp-automations/${automation.id}/disconnect`,
        { method: "DELETE" },
      );

      setAutomations((current) =>
        current.map((item) => ({ ...item, connection: payload.data })),
      );
      showToast("success", "Instancia desconectada.");
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Nao foi possivel desconectar.",
      );
    } finally {
      setBusyAutomationId(null);
    }
  }

  return (
    <AppShell>
      <div className="grid w-full gap-6 px-4 py-6 lg:px-8">
        <section className="border-b pb-5">
          <p className="text-sm font-medium text-primary">Automações</p>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Conecte um número para todas as automações
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Um único WhatsApp alimenta o fluxo de SDR Automatizado.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                disabled={!primaryAutomation || Boolean(busyAutomationId)}
                onClick={() => {
                  if (!primaryAutomation) {
                    return;
                  }

                  if (sharedConnection?.status === "connected") {
                    void disconnect(primaryAutomation);
                    return;
                  }

                  void connect(primaryAutomation);
                }}
              >
                {busyAutomationId ? (
                  <Loader2 className="animate-spin" />
                ) : sharedConnection?.status === "connected" ? (
                  <Unplug />
                ) : (
                  <PlugZap />
                )}
                {sharedConnection?.status === "connected"
                  ? "Desconectar WhatsApp"
                  : "Conectar WhatsApp"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => void load(true)}
              >
                <RefreshCw className={cn(isLoading && "animate-spin")} />
                Atualizar
              </Button>
            </div>
          </div>
        </section>

        {toast ? (
          <div
            className={cn(
              "rounded-lg border px-4 py-3 text-sm",
              toast.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-destructive/30 bg-destructive/10 text-destructive",
            )}
          >
            {toast.message}
          </div>
        ) : null}

        <section className="rounded-xl border bg-card/70 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg border bg-background text-primary">
                <Workflow className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold">Número conectado</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {sharedConnection?.phone_number ?? "Nenhum número conectado"}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "w-fit rounded-full border px-2.5 py-1 text-xs font-medium",
                statusClass(sharedConnection?.status),
              )}
            >
              {statusLabel(sharedConnection?.status)}
            </span>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="min-h-64 animate-pulse rounded-xl border bg-card/60"
              />
            ))
          ) : automations.length === 0 ? (
            <div className="rounded-xl border bg-card/70 p-6 text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
              Nenhuma automação WhatsApp ativa foi configurada.
            </div>
          ) : (
            automations.map((automation) => {
              const status = automation.connection?.status;

              return (
                <article
                  key={automation.id}
                  className="grid min-h-56 gap-5 rounded-xl border bg-card/70 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex size-11 items-center justify-center rounded-lg border bg-background text-primary">
                      <AutomationIcon name={automation.icon} />
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        statusClass(status),
                      )}
                    >
                      {statusLabel(status)}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold">{automation.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {automation.description}
                    </p>
                  </div>

                  <dl className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Workflow</dt>
                      <dd className="max-w-44 truncate font-medium">{automation.workflow_id}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Número</dt>
                      <dd className="font-medium">
                        {sharedConnection?.phone_number ?? "-"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto">
                    <Button
                      type="button"
                      className="w-full"
                      disabled={busyAutomationId === automation.id}
                      onClick={() => void activate(automation)}
                    >
                      {busyAutomationId === automation.id ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <PlugZap />
                      )}
                      Ativar Automação
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2 w-full"
                      disabled={!automation.workflow_url}
                      asChild={Boolean(automation.workflow_url)}
                    >
                      {automation.workflow_url ? (
                        <a href={automation.workflow_url} target="_blank" rel="noreferrer">
                          <ExternalLink />
                          Abrir Automação
                        </a>
                      ) : (
                        <span>
                          <ExternalLink />
                          Abrir Automação
                        </span>
                      )}
                    </Button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>

      {activeAutomation ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-xl border bg-card p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary">Conectar WhatsApp</p>
                <h2 className="mt-1 text-xl font-semibold">Número das automações</h2>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium",
                  statusClass(modalConnection?.status),
                )}
              >
                {statusLabel(modalConnection?.status)}
              </span>
            </div>

            <div className="mt-5 grid place-items-center rounded-lg border bg-background p-4">
              {qrcode?.base64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrcode.base64}
                  alt="QR Code para conectar WhatsApp"
                  className="size-72 max-h-[70vw] max-w-full rounded-md bg-white p-2"
                />
              ) : (
                <div className="grid size-72 max-h-[70vw] max-w-full place-items-center rounded-md border border-dashed text-muted-foreground">
                  <QrCode className="size-10" />
                </div>
              )}
            </div>

            {qrcode?.pairingCode ? (
              <div className="mt-3 rounded-lg border bg-background/70 p-3 text-sm">
                Código de pareamento:{" "}
                <strong className="font-mono">{qrcode.pairingCode}</strong>
              </div>
            ) : null}

            <p className="mt-4 text-sm text-muted-foreground">
              A verificação roda automaticamente a cada 5 segundos. Quando o número conectar, todos os fluxos ativos serão acionados com essa instância.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={busyAutomationId === activeAutomation.id}
                onClick={() => void refreshQrCode()}
              >
                {busyAutomationId === activeAutomation.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RefreshCw />
                )}
                Atualizar QR
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setActiveAutomation(null);
                  setQrcode(null);
                }}
              >
                Fechar
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
