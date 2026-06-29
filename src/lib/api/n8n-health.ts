export type N8nApiHealth = {
  ok: boolean;
  configured: boolean;
  status: number | null;
  error?: string;
};

export function n8nConfigStatus() {
  const apiUrl = process.env.N8N_API_URL?.replace(/\/+$/, "") ?? "";
  const appUrl = process.env.N8N_APP_URL?.replace(/\/+$/, "") ?? "";
  const apiKey = process.env.N8N_API_KEY ?? "";

  return {
    apiUrl,
    appUrl,
    apiKey,
    configured: {
      api_url: Boolean(apiUrl),
      app_url: Boolean(appUrl),
      api_key: Boolean(apiKey),
    },
  };
}

export async function checkN8nApiHealth(): Promise<N8nApiHealth> {
  const { apiUrl, apiKey } = n8nConfigStatus();

  if (!apiUrl || !apiKey) {
    return { ok: false, configured: false, status: null };
  }

  try {
    const response = await fetch(`${apiUrl}/api/v1/workflows?limit=1`, {
      headers: { "X-N8N-API-KEY": apiKey },
      cache: "no-store",
    });

    return {
      ok: response.ok,
      configured: true,
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      status: null,
      error: error instanceof Error ? error.message : "unknown_error",
    };
  }
}
