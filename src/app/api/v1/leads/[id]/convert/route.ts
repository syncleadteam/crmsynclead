import { createActivity, getPipelineStage } from "@/lib/api/deals";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { requirePermission } from "@/lib/api/permissions";
import { convertLeadSchema } from "@/lib/api/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "deals", "create");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const parsed = convertLeadSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { data: lead, error: leadError } = await auth.context.supabase
    .from("leads")
    .select("*,contact:contacts(id,company_id)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (leadError || !lead) {
    return apiError("not_found", "Lead nao encontrado.", 404);
  }

  if (lead.status !== "qualified") {
    return apiError("bad_request", "Apenas leads qualificados podem ser convertidos.", 400);
  }

  if (lead.converted_deal_id) {
    return apiError("bad_request", "Lead ja convertido.", 400);
  }

  const stageResult = await getPipelineStage(
    auth.context,
    parsed.data.stage_id,
    parsed.data.pipeline_id,
  );

  if (!stageResult.ok) {
    return stageResult.response;
  }

  const contact = Array.isArray(lead.contact) ? lead.contact[0] : lead.contact;

  const { data: deal, error: dealError } = await auth.context.supabase
    .from("deals")
    .insert({
      title: parsed.data.title,
      company_id: contact?.company_id ?? null,
      contact_id: lead.contact_id,
      pipeline_id: parsed.data.pipeline_id,
      stage_id: parsed.data.stage_id,
      value: parsed.data.value,
      status: "open",
      owner_id: lead.owner_id,
      expected_close_date: parsed.data.expected_close_date ?? null,
    })
    .select("id,title,company_id,contact_id,pipeline_id,stage_id,value,status,lost_reason,owner_id,expected_close_date,closed_at,created_at,updated_at")
    .single();

  if (dealError) {
    return apiError("bad_request", "Nao foi possivel criar oportunidade a partir do lead.", 400, dealError.message);
  }

  const { error: updateError } = await auth.context.supabase
    .from("leads")
    .update({
      status: "converted",
      converted_deal_id: deal.id,
    })
    .eq("id", id);

  if (updateError) {
    return apiError("bad_request", "Oportunidade criada, mas o lead nao foi marcado como convertido.", 400, updateError.message);
  }

  await createActivity(auth.context, {
    entity_type: "lead",
    entity_id: id,
    action: "lead_converted",
    metadata: { converted_deal_id: deal.id },
  });

  await createActivity(auth.context, {
    entity_type: "deal",
    entity_id: deal.id,
    action: "created_from_lead",
    metadata: { lead_id: id },
  });

  return apiData(deal, { status: 201 });
}
