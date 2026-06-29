import { apiData, apiError } from "@/lib/api/errors";
import { requireN8nCallback } from "@/lib/api/n8n";
import { processN8nSyncEvent, type N8nSyncPayload } from "@/lib/api/n8n-sync";
import { verifyIntegrationSignature } from "@/lib/api/integration-events";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

function isSigned(request: Request, body: string) {
  return verifyIntegrationSignature(
    body,
    request.headers.get("x-synclead-timestamp"),
    request.headers.get("x-synclead-signature"),
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const callbackError = isSigned(request, body) ? null : requireN8nCallback(request);

  if (callbackError) {
    return callbackError;
  }

  let payload: N8nSyncPayload | null;

  try {
    payload = JSON.parse(body || "null") as N8nSyncPayload | null;
  } catch {
    return apiError("validation_error", "Payload N8N nao e um JSON valido.", 422);
  }

  if (!payload?.event_type) {
    return apiError("validation_error", "Payload N8N sem event_type.", 422);
  }

  let supabase: ReturnType<typeof createSupabaseServiceClient>;
  try {
    supabase = createSupabaseServiceClient();
  } catch {
    return apiError("internal_error", "Supabase service role nao configurado.", 500);
  }

  try {
    const result = await processN8nSyncEvent(supabase, payload);

    return apiData(result);
  } catch (error) {
    return apiError(
      "bad_request",
      "Nao foi possivel sincronizar evento do N8N.",
      400,
      error instanceof Error ? error.message : "unknown_error",
    );
  }
}
