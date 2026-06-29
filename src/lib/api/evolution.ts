import { apiError } from "@/lib/api/errors";

type EvolutionCreateResponse = {
  instance?: {
    instanceName?: string;
    instanceId?: string;
    status?: string;
  };
  hash?: string;
  qrcode?: {
    code?: string | null;
    base64?: string | null;
    pairingCode?: string | null;
    count?: number;
  };
};

type EvolutionConnectionStateResponse = {
  instance?: {
    instanceName?: string;
    state?: string;
    status?: string;
    owner?: string;
    ownerJid?: string;
    profileName?: string;
  };
  state?: string;
  status?: string;
};

export type EvolutionConnectionStatus = {
  status: "connecting" | "connected" | "disconnected" | "error";
  phoneNumber: string | null;
  rawStatus: string | null;
};

export type EvolutionInstanceResult = {
  instanceId: string;
  instanceName: string;
  instanceApiKey: string | null;
  status: "connecting" | "connected" | "disconnected" | "error";
  qrcode: {
    code: string | null;
    base64: string | null;
    pairingCode: string | null;
  } | null;
};

function evolutionConfig() {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("Evolution API nao configurada.");
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
  };
}

function normalizeStatus(value: string | null | undefined): EvolutionConnectionStatus["status"] {
  const normalized = value?.toLowerCase();

  if (normalized === "open" || normalized === "connected") {
    return "connected";
  }

  if (normalized === "close" || normalized === "closed" || normalized === "disconnected") {
    return "disconnected";
  }

  if (normalized === "error") {
    return "error";
  }

  return "connecting";
}

function extractPhoneNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.split("@")[0]?.replace(/\D/g, "") || null;
}

async function evolutionFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { baseUrl, apiKey } = evolutionConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T) : ({} as T);

  if (!response.ok) {
    throw new Error(
      text || `Evolution API respondeu com HTTP ${response.status}.`,
    );
  }

  return payload;
}

export const EvolutionService = {
  async createInstance(instanceName: string): Promise<EvolutionInstanceResult> {
    const payload = await evolutionFetch<EvolutionCreateResponse>("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    const instanceId = payload.instance?.instanceId;

    if (!instanceId) {
      throw new Error("Evolution API nao retornou instanceId.");
    }

    return {
      instanceId,
      instanceName: payload.instance?.instanceName ?? instanceName,
      instanceApiKey: payload.hash ?? null,
      status: normalizeStatus(payload.instance?.status),
      qrcode: payload.qrcode
        ? {
            code: payload.qrcode.code ?? null,
            base64: payload.qrcode.base64 ?? null,
            pairingCode: payload.qrcode.pairingCode ?? null,
          }
        : null,
    };
  },

  async getQrCode(instanceName: string) {
    const payload = await evolutionFetch<EvolutionCreateResponse>(
      `/instance/connect/${encodeURIComponent(instanceName)}`,
    );

    return payload.qrcode
      ? {
          code: payload.qrcode.code ?? null,
          base64: payload.qrcode.base64 ?? null,
          pairingCode: payload.qrcode.pairingCode ?? null,
        }
      : null;
  },

  async getConnectionStatus(instanceName: string): Promise<EvolutionConnectionStatus> {
    const payload = await evolutionFetch<EvolutionConnectionStateResponse>(
      `/instance/connectionState/${encodeURIComponent(instanceName)}`,
    );
    const rawStatus = payload.instance?.state ?? payload.instance?.status ?? payload.state ?? payload.status ?? null;

    return {
      status: normalizeStatus(rawStatus),
      phoneNumber: extractPhoneNumber(payload.instance?.ownerJid ?? payload.instance?.owner),
      rawStatus,
    };
  },

  async disconnectInstance(instanceName: string) {
    await evolutionFetch(`/instance/logout/${encodeURIComponent(instanceName)}`, {
      method: "DELETE",
    }).catch(async () => {
      await evolutionFetch(`/instance/delete/${encodeURIComponent(instanceName)}`, {
        method: "DELETE",
      });
    });
  },

  async setWebhook(instanceName: string, webhookUrl: string) {
    await evolutionFetch(`/webhook/set/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: false,
          events: ["MESSAGES_UPSERT"],
        },
      }),
    });
  },

  async sendText(instanceName: string, number: string, text: string) {
    await evolutionFetch(`/message/sendText/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      body: JSON.stringify({
        number,
        text,
      }),
    });
  },
};

export function evolutionConfigError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Falha ao comunicar com Evolution API.";

  if (message.includes("nao configurada")) {
    return apiError("internal_error", message, 500);
  }

  return apiError("bad_request", "Falha na Evolution API.", 400, message);
}
