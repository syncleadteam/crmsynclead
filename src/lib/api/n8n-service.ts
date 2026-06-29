function n8nConfig() {
  const baseUrl = process.env.N8N_API_URL?.replace(/\/+$/, "");
  const apiKey = process.env.N8N_API_KEY;

  return { baseUrl, apiKey };
}

export const N8nService = {
  async activateWorkflow(workflowId: string) {
    const { baseUrl, apiKey } = n8nConfig();

    if (!baseUrl || !apiKey || !workflowId || workflowId.startsWith("pending:")) {
      return { skipped: true };
    }

    const response = await fetch(
      `${baseUrl}/api/v1/workflows/${encodeURIComponent(workflowId)}/activate`,
      {
        method: "POST",
        headers: {
          "X-N8N-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `n8n respondeu com HTTP ${response.status}.`);
    }

    return { skipped: false };
  },
};
