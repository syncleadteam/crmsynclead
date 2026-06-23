import { apiData, apiError, validationError } from "@/lib/api/errors";
import { requirePermission } from "@/lib/api/permissions";
import { resolveOwnerId } from "@/lib/api/ownership";
import { updateCompanySchema } from "@/lib/api/schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "companies", "view");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const { data, error } = await auth.context.supabase
    .from("companies")
    .select("id,name,document_number,segment,owner_id,created_at,updated_at,owner:users!companies_owner_id_fkey(id,email,full_name,role),contacts(id,full_name,email,phone)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return apiError("not_found", "Conta nao encontrada.", 404);
  }

  return apiData(data);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "companies", "update");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const parsed = updateCompanySchema.safeParse({
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
    .from("companies")
    .update({
      ...changes,
      owner_id: ownerId ? resolveOwnerId(auth.context, ownerId) : undefined,
    })
    .eq("id", id)
    .select("id,name,document_number,segment,owner_id,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel atualizar conta.", 400, error.message);
  }

  return apiData(data);
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "companies", "delete");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const { data, error } = await auth.context.supabase
    .from("companies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel excluir conta.", 400, error.message);
  }

  return apiData(data);
}
