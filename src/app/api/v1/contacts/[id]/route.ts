import { apiData, apiError, validationError } from "@/lib/api/errors";
import { flushIntegrationEvents } from "@/lib/api/integration-dispatch";
import { requirePermission } from "@/lib/api/permissions";
import { resolveOwnerId } from "@/lib/api/ownership";
import { updateContactSchema } from "@/lib/api/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "contacts", "view");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const { data, error } = await auth.context.supabase
    .from("contacts")
    .select("id,full_name,email,phone,company_id,owner_id,source,created_at,updated_at,company:companies(id,name),owner:users!contacts_owner_id_fkey(id,email,full_name,role),leads(id,status,score)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return apiError("not_found", "Contato nao encontrado.", 404);
  }

  return apiData(data);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "contacts", "update");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const parsed = updateContactSchema.safeParse({
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
    .from("contacts")
    .update({
      ...changes,
      owner_id: ownerId ? resolveOwnerId(auth.context, ownerId) : undefined,
    })
    .eq("id", id)
    .select("id,full_name,email,phone,company_id,owner_id,source,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel atualizar contato.", 400, error.message);
  }

  await flushIntegrationEvents();

  return apiData(data);
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "contacts", "delete");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const { data, error } = await auth.context.supabase
    .from("contacts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel excluir contato.", 400, error.message);
  }

  return apiData(data);
}
