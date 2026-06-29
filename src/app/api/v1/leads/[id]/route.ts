import { apiData, apiError, validationError } from "@/lib/api/errors";
import { flushIntegrationEvents } from "@/lib/api/integration-dispatch";
import { requirePermission } from "@/lib/api/permissions";
import { resolveOwnerId } from "@/lib/api/ownership";
import { updateLeadSchema } from "@/lib/api/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "leads", "view");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const { data, error } = await auth.context.supabase
    .from("leads")
    .select("id,contact_id,status,score,disqualification_reason,owner_id,converted_deal_id,created_at,updated_at,contact:contacts(id,full_name,email,phone,source,company:companies(id,name,segment)),owner:users!leads_owner_id_fkey(id,email,full_name,role),converted_deal:deals!leads_converted_deal_id_fkey(id,title,value,status)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return apiError("not_found", "Lead nao encontrado.", 404);
  }

  const { data: activities, error: activitiesError } = await auth.context.supabase
    .from("activities")
    .select("id,entity_type,entity_id,actor_type,actor_id,action,metadata,created_at,actor:users(id,email,full_name,role)")
    .eq("entity_type", "lead")
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (activitiesError) {
    return apiError("bad_request", "Lead carregado, mas a timeline falhou.", 400, activitiesError.message);
  }

  return apiData({ ...data, activities: activities ?? [] });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "leads", "update");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const parsed = updateLeadSchema.safeParse({
    ...(await request.json().catch(() => null)),
    id,
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const changes: Partial<typeof parsed.data> = { ...parsed.data };
  const ownerId = changes.owner_id;
  delete changes.id;
  delete changes.owner_id;
  const { data, error } = await auth.context.supabase
    .from("leads")
    .update({
      ...changes,
      owner_id: ownerId ? resolveOwnerId(auth.context, ownerId) : undefined,
    })
    .eq("id", id)
    .select("id,contact_id,status,score,disqualification_reason,owner_id,converted_deal_id,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel atualizar lead.", 400, error.message);
  }

  await flushIntegrationEvents();

  return apiData(data);
}
