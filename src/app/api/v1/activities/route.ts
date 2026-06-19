import { requireAuth } from "@/lib/api/auth";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { requireN8nCallback } from "@/lib/api/n8n";
import { listLimit } from "@/lib/api/ownership";
import { createExternalActivitySchema, listActivitiesSchema } from "@/lib/api/schemas";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function GET(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const parsed = listActivitiesSchema.safeParse({
    entity_type: searchParams.get("entity_type") ?? undefined,
    entity_id: searchParams.get("entity_id") ?? undefined,
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  let query = auth.context.supabase
    .from("activities")
    .select("id,entity_type,entity_id,actor_type,actor_id,action,metadata,created_at,actor:users(id,email,full_name,role)")
    .order("created_at", { ascending: false })
    .limit(listLimit(request));

  if (parsed.data.entity_type) {
    query = query.eq("entity_type", parsed.data.entity_type);
  }

  if (parsed.data.entity_id) {
    query = query.eq("entity_id", parsed.data.entity_id);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar atividades.", 400, error.message);
  }

  return apiData(data);
}

export async function POST(request: Request) {
  const callbackError = requireN8nCallback(request);

  if (callbackError) {
    return callbackError;
  }

  const parsed = createExternalActivitySchema.safeParse(
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

  const { data, error } = await supabase
    .from("activities")
    .insert({
      entity_type: parsed.data.entity_type,
      entity_id: parsed.data.entity_id,
      actor_type: "n8n",
      actor_id: null,
      action: parsed.data.action,
      metadata: parsed.data.metadata as Json,
    })
    .select("id,entity_type,entity_id,actor_type,actor_id,action,metadata,created_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel registrar atividade.", 400, error.message);
  }

  return apiData(data, { status: 201 });
}
