import { apiData, apiError, validationError } from "@/lib/api/errors";
import { requireN8nCallback } from "@/lib/api/n8n";
import { googleCalendarEventsSyncSchema } from "@/lib/api/schemas";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/supabase";

type TaskStatus = Database["public"]["Enums"]["task_status"];

async function resolveAssignedTo(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  explicitUserId?: string,
) {
  if (explicitUserId) {
    return explicitUserId;
  }

  if (process.env.GOOGLE_CALENDAR_DEFAULT_ASSIGNEE_ID) {
    return process.env.GOOGLE_CALENDAR_DEFAULT_ASSIGNEE_ID;
  }

  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function POST(request: Request) {
  const callbackError = requireN8nCallback(request);

  if (callbackError) {
    return callbackError;
  }

  const parsed = googleCalendarEventsSyncSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  let supabase: ReturnType<typeof createSupabaseServiceClient>;
  try {
    supabase = createSupabaseServiceClient();
  } catch {
    return apiError("internal_error", "Supabase service role nao configurado.", 500);
  }

  let upserted = 0;
  let canceled = 0;
  const errors: string[] = [];

  for (const event of parsed.data.events) {
    const assignedTo = await resolveAssignedTo(supabase, event.assigned_to);

    if (!assignedTo) {
      errors.push(`Sem usuario ativo para o evento ${event.event_id}.`);
      continue;
    }

    const status: TaskStatus = event.status === "cancelled" ? "canceled" : "pending";
    const { error } = await supabase
      .from("tasks")
      .upsert(
        {
          title: event.title,
          type: "meeting",
          related_entity_type: event.related_entity_type ?? null,
          related_entity_id: event.related_entity_id ?? null,
          due_at: event.start,
          starts_at: event.start,
          ends_at: event.end ?? null,
          status,
          assigned_to: assignedTo,
          external_calendar_event_id: event.event_id,
          google_calendar_id: event.calendar_id,
          google_calendar_html_link: event.html_link ?? null,
          google_calendar_event_status: event.status,
          canceled_at: status === "canceled" ? new Date().toISOString() : null,
          completed_at: null,
        },
        { onConflict: "external_calendar_event_id" },
      );

    if (error) {
      errors.push(`${event.event_id}: ${error.message}`);
      continue;
    }

    const { error: stateError } = event.related_entity_type && event.related_entity_id
      ? await supabase.from("integrations_state").upsert(
          {
            provider: parsed.data.provider,
            entity_type: event.related_entity_type,
            entity_id: event.related_entity_id,
            external_id: event.event_id,
            status: event.status,
            metadata: event.metadata as Json,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "provider,entity_type,entity_id" },
        )
      : { error: null };

    if (stateError) {
      errors.push(`${event.event_id}: ${stateError.message}`);
      continue;
    }

    upserted += 1;
    canceled += status === "canceled" ? 1 : 0;
  }

  if (errors.length > 0 && upserted === 0) {
    return apiError("bad_request", "Nenhum evento foi sincronizado.", 400, errors.join(" | "));
  }

  return apiData({
    provider: parsed.data.provider,
    upserted,
    canceled,
    errors,
  });
}
