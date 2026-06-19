import { apiData, apiError, validationError } from "@/lib/api/errors";
import { requireN8nCallback } from "@/lib/api/n8n";
import { leadScoreSchema } from "@/lib/api/schemas";
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
  const parsed = leadScoreSchema.safeParse(await request.json().catch(() => null));

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
    .from("leads")
    .update({ score: parsed.data.score })
    .eq("id", id)
    .select("id,score")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel atualizar score.", 400, error.message);
  }

  await supabase.from("integrations_state").upsert(
    {
      provider: parsed.data.provider,
      entity_type: "lead",
      entity_id: id,
      status: parsed.data.status,
      metadata: parsed.data.metadata as Json,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "provider,entity_type,entity_id" },
  );

  await supabase.from("activities").insert({
    entity_type: "lead",
    entity_id: id,
    actor_type: "n8n",
    actor_id: null,
    action: "lead_scored",
    metadata: { score: parsed.data.score, source: parsed.data.provider } as Json,
  });

  return apiData(data);
}
