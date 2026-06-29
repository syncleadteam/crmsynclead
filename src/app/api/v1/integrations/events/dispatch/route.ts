import { apiData, apiError } from "@/lib/api/errors";
import { dispatchIntegrationEvents, isDispatchAuthorized } from "@/lib/api/integration-events";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isDispatchAuthorized(request)) {
    return apiError("unauthorized", "Dispatcher nao autorizado.", 401);
  }

  let supabase: ReturnType<typeof createSupabaseServiceClient>;

  try {
    supabase = createSupabaseServiceClient();
  } catch {
    return apiError("internal_error", "Supabase service role nao configurado.", 500);
  }

  const result = await dispatchIntegrationEvents(supabase, 10);

  return apiData(result);
}
