import { requireAuth } from "@/lib/api/auth";
import { deriveDealStatus, getPipelineStage, validateDealStatusForStage } from "@/lib/api/deals";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { resolveOwnerId } from "@/lib/api/ownership";
import { updateDealSchema } from "@/lib/api/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const { data, error } = await auth.context.supabase
    .from("deals")
    .select("id,title,company_id,contact_id,pipeline_id,stage_id,value,status,lost_reason,owner_id,expected_close_date,closed_at,created_at,updated_at,company:companies(id,name),contact:contacts(id,full_name,email),pipeline:pipelines(id,name),stage:pipeline_stages(id,name,position,probability,is_won_stage,is_lost_stage),owner:users!deals_owner_id_fkey(id,email,full_name,role)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return apiError("not_found", "Oportunidade nao encontrada.", 404);
  }

  return apiData(data);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const parsed = updateDealSchema.safeParse({
    ...(await request.json().catch(() => null)),
    id,
  });

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

  const nextPipelineId = parsed.data.pipeline_id ?? current.pipeline_id;
  const nextStageId = parsed.data.stage_id ?? current.stage_id;
  const stageResult = await getPipelineStage(auth.context, nextStageId, nextPipelineId);

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

  const changes: Partial<typeof parsed.data> = { ...parsed.data };
  const ownerId = changes.owner_id;
  delete changes.id;
  delete changes.owner_id;

  const { data, error } = await auth.context.supabase
    .from("deals")
    .update({
      ...changes,
      status: nextStatus,
      owner_id: ownerId ? resolveOwnerId(auth.context, ownerId) : undefined,
      closed_at: nextStatus === "open" ? null : (current.closed_at ?? new Date().toISOString()),
    })
    .eq("id", id)
    .select("id,title,company_id,contact_id,pipeline_id,stage_id,value,status,lost_reason,owner_id,expected_close_date,closed_at,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel atualizar oportunidade.", 400, error.message);
  }

  return apiData(data);
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const { data, error } = await auth.context.supabase
    .from("deals")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel excluir oportunidade.", 400, error.message);
  }

  return apiData(data);
}
