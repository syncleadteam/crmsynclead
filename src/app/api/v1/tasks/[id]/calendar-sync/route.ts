import { apiData, apiError, validationError } from "@/lib/api/errors";
import { requireN8nCallback } from "@/lib/api/n8n";
import { calendarSyncSchema } from "@/lib/api/schemas";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const callbackError = requireN8nCallback(request);

  if (callbackError) {
    return callbackError;
  }

  const { id } = await context.params;
  const parsed = calendarSyncSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  let supabase: ReturnType<typeof createSupabaseServiceClient>;
  try {
    supabase = createSupabaseServiceClient();
  } catch {
    return apiError("internal_error", "Supabase service role nao configurado.", 500);
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .update({
      external_calendar_event_id: parsed.data.external_calendar_event_id,
      google_calendar_event_status: parsed.data.status,
    })
    .eq("id", id)
    .select("id,related_entity_type,related_entity_id")
    .single();

  if (taskError || !task) {
    return apiError("not_found", "Tarefa nao encontrada.", 404);
  }

  const { error: stateError } = task.related_entity_type && task.related_entity_id
    ? await supabase
        .from("integrations_state")
        .upsert(
          {
            provider: parsed.data.provider,
            entity_type: task.related_entity_type,
            entity_id: task.related_entity_id,
            external_id: parsed.data.external_calendar_event_id,
            status: parsed.data.status,
            metadata: parsed.data.metadata as Json,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "provider,entity_type,entity_id" },
        )
    : { error: null };

  if (stateError) {
    return apiError("bad_request", "Tarefa sincronizada, mas estado nao foi atualizado.", 400, stateError.message);
  }

  return apiData(task);
}
