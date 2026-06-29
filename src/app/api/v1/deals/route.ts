import { deriveDealStatus, getPipelineStage, validateDealStatusForStage } from "@/lib/api/deals";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { flushIntegrationEvents } from "@/lib/api/integration-dispatch";
import { requirePermission } from "@/lib/api/permissions";
import { listLimit, resolveOwnerId } from "@/lib/api/ownership";
import { createDealSchema } from "@/lib/api/schemas";
import type { Database } from "@/types/supabase";

type DealStatus = Database["public"]["Enums"]["deal_status"];

const dealStatuses: DealStatus[] = ["open", "won", "lost"];

function isDealStatus(value: string): value is DealStatus {
  return dealStatuses.includes(value as DealStatus);
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "deals", "view");

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const pipelineId = searchParams.get("pipeline_id");
  const stageId = searchParams.get("stage_id");
  const status = searchParams.get("status");

  let query = auth.context.supabase
    .from("deals")
    .select("id,title,company_id,contact_id,pipeline_id,stage_id,value,status,lost_reason,owner_id,expected_close_date,closed_at,created_at,updated_at,company:companies(id,name),contact:contacts(id,full_name,email),pipeline:pipelines(id,name),stage:pipeline_stages(id,name,position,is_won_stage,is_lost_stage),owner:users!deals_owner_id_fkey(id,email,full_name,role)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(listLimit(request));

  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId);
  }

  if (stageId) {
    query = query.eq("stage_id", stageId);
  }

  if (status && isDealStatus(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar oportunidades.", 400, error.message);
  }

  return apiData(data);
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "deals", "create");

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = createDealSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const stageResult = await getPipelineStage(
    auth.context,
    parsed.data.stage_id,
    parsed.data.pipeline_id,
  );

  if (!stageResult.ok) {
    return stageResult.response;
  }

  const status = deriveDealStatus(stageResult.stage, parsed.data.status);
  const statusError = validateDealStatusForStage(
    stageResult.stage,
    status,
    parsed.data.lost_reason,
  );

  if (statusError) {
    return statusError;
  }

  const { data, error } = await auth.context.supabase
    .from("deals")
    .insert({
      title: parsed.data.title,
      company_id: parsed.data.company_id ?? null,
      contact_id: parsed.data.contact_id,
      pipeline_id: parsed.data.pipeline_id,
      stage_id: parsed.data.stage_id,
      value: parsed.data.value,
      status,
      lost_reason: parsed.data.lost_reason ?? null,
      owner_id: resolveOwnerId(auth.context, parsed.data.owner_id),
      expected_close_date: parsed.data.expected_close_date ?? null,
      closed_at: status === "open" ? null : new Date().toISOString(),
    })
    .select("id,title,company_id,contact_id,pipeline_id,stage_id,value,status,lost_reason,owner_id,expected_close_date,closed_at,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel criar oportunidade.", 400, error.message);
  }

  await flushIntegrationEvents();

  return apiData(data, { status: 201 });
}
