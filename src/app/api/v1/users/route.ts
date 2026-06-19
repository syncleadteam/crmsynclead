import { requireRole } from "@/lib/api/auth";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { createUserSchema, updateUserSchema } from "@/lib/api/schemas";
import { userRoles, type UserRole } from "@/lib/auth/roles";

function isUserRole(value: string): value is UserRole {
  return userRoles.includes(value as UserRole);
}

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "manager"]);

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const limit = Number(searchParams.get("limit") ?? 100);

  let query = auth.context.supabase
    .from("users")
    .select("id,email,full_name,role,is_active,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 100);

  if (role && isUserRole(role)) {
    query = query.eq("role", role);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar usuarios.", 400, error.message);
  }

  return apiData(data);
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = createUserSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { data, error } = await auth.context.supabase
    .from("users")
    .insert(parsed.data)
    .select("id,email,full_name,role,is_active,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel criar usuario.", 400, error.message);
  }

  return apiData(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = updateUserSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { id, ...changes } = parsed.data;

  const { data, error } = await auth.context.supabase
    .from("users")
    .update(changes)
    .eq("id", id)
    .select("id,email,full_name,role,is_active,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel atualizar usuario.", 400, error.message);
  }

  return apiData(data);
}
