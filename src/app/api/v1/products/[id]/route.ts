import { requireAuth, requireRole } from "@/lib/api/auth";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { updateProductSchema } from "@/lib/api/schemas";

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
    .from("products")
    .select("id,name,description,sku,unit_price,is_active,created_at,updated_at")
    .eq("id", id)
    .single();

  if (error) {
    return apiError("not_found", "Produto nao encontrado.", 404);
  }

  return apiData(data);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const parsed = updateProductSchema.safeParse({
    ...(await request.json().catch(() => null)),
    id,
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const changes: Partial<typeof parsed.data> = { ...parsed.data };
  delete changes.id;

  const { data, error } = await auth.context.supabase
    .from("products")
    .update(changes)
    .eq("id", id)
    .select("id,name,description,sku,unit_price,is_active,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel atualizar produto.", 400, error.message);
  }

  return apiData(data);
}
