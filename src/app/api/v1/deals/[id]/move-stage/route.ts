import {
  createActivity,
  dealStageMetadata,
  deriveDealStatus,
  getPipelineStage,
  validateDealStatusForStage,
} from "@/lib/api/deals";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { flushIntegrationEvents } from "@/lib/api/integration-dispatch";
import { requirePermission } from "@/lib/api/permissions";
import { moveDealStageSchema } from "@/lib/api/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "deals", "update");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const parsed = moveDealStageSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { data: current, error: currentError } = await auth.context.supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (currentError || !current) {
    return apiError("not_found", "Oportunidade nao encontrada.", 404);
  }

  const stageResult = await getPipelineStage(
    auth.context,
    parsed.data.stage_id,
    current.pipeline_id,
  );

  if (!stageResult.ok) {
    return stageResult.response;
  }

  const nextStatus = deriveDealStatus(stageResult.stage, parsed.data.status);
  const statusError = validateDealStatusForStage(
    stageResult.stage,
    nextStatus,
    parsed.data.lost_reason ?? current.lost_reason,
  );

  if (statusError) {
    return statusError;
  }

  const { data, error } = await auth.context.supabase
    .from("deals")
    .update({
      stage_id: stageResult.stage.id,
      status: nextStatus,
      lost_reason: parsed.data.lost_reason ?? current.lost_reason,
      value: parsed.data.value ?? current.value,
      expected_close_date:
        parsed.data.expected_close_date ?? current.expected_close_date,
      closed_at: nextStatus === "open" ? null : (current.closed_at ?? new Date().toISOString()),
    })
    .eq("id", id)
    .select("id,title,company_id,contact_id,pipeline_id,stage_id,value,status,lost_reason,owner_id,expected_close_date,closed_at,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel mover oportunidade.", 400, error.message);
  }

  const activity = await createActivity(auth.context, {
    entity_type: "deal",
    entity_id: id,
    action: "stage_changed",
    metadata: {
      ...dealStageMetadata(current, stageResult.stage),
      to_status: nextStatus,
    },
  });

  if (activity.error) {
    return apiError("bad_request", "Oportunidade movida, mas a atividade nao foi registrada.", 400, activity.error.message);
  }

  await flushIntegrationEvents();

  return apiData(data);
}
