import type { AuthContext } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import type { Database, Json, Tables } from "@/types/supabase";

type PipelineStage = Tables<"pipeline_stages">;
type Deal = Tables<"deals">;
type DealStatus = Database["public"]["Enums"]["deal_status"];

export async function getPipelineStage(
  context: AuthContext,
  stageId: string,
  pipelineId?: string,
): Promise<
  | { ok: true; stage: PipelineStage }
  | { ok: false; response: Response }
> {
  let query = context.supabase
    .from("pipeline_stages")
    .select("*")
    .eq("id", stageId);

  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return {
      ok: false,
      response: apiError("bad_request", "Etapa invalida para o pipeline.", 400),
    };
  }

  return { ok: true, stage: data };
}

export function deriveDealStatus(stage: PipelineStage, requested?: DealStatus) {
  if (requested) {
    return requested;
  }

  if (stage.is_won_stage) {
    return "won" as const;
  }

  if (stage.is_lost_stage) {
    return "lost" as const;
  }

  return "open" as const;
}

export function validateDealStatusForStage(
  stage: PipelineStage,
  status: DealStatus,
  lostReason?: string | null,
) {
  if (status === "won" && !stage.is_won_stage) {
    return apiError(
      "bad_request",
      "Deal so pode ser ganho em uma etapa final positiva.",
      400,
    );
  }

  if (status === "lost" && !lostReason) {
    return apiError("validation_error", "Motivo de perda obrigatorio.", 422);
  }

  return null;
}

export async function createActivity(
  context: AuthContext,
  input: {
    entity_type: "lead" | "deal" | "contact" | "company";
    entity_id: string;
    action: string;
    metadata?: Record<string, unknown>;
    actor_type?: "user" | "system";
  },
) {
  return context.supabase.from("activities").insert({
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    actor_type: input.actor_type ?? "user",
    actor_id: input.actor_type === "system" ? null : context.profile.id,
    action: input.action,
    metadata: (input.metadata ?? {}) as Json,
  });
}

export function dealStageMetadata(from: Deal, to: PipelineStage) {
  return {
    from_stage_id: from.stage_id,
    to_stage_id: to.id,
    from_status: from.status,
  };
}
