import { dispatchIntegrationEvents } from "@/lib/api/integration-events";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function flushIntegrationEvents(limit = 10) {
  try {
    const supabase = createSupabaseServiceClient();

    await dispatchIntegrationEvents(supabase, limit);
  } catch (error) {
    console.error("integration_dispatch_failed", error);
  }
}
