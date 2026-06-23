import { apiData, apiError, validationError } from "@/lib/api/errors";
import { requirePermission } from "@/lib/api/permissions";
import { listLimit, resolveOwnerId } from "@/lib/api/ownership";
import { createContactSchema } from "@/lib/api/schemas";

export async function GET(request: Request) {
  const auth = await requirePermission(request, "contacts", "view");

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  let query = auth.context.supabase
    .from("contacts")
    .select("id,full_name,email,phone,company_id,owner_id,source,created_at,updated_at,company:companies(id,name),owner:users!contacts_owner_id_fkey(id,email,full_name,role)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(listLimit(request));

  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar contatos.", 400, error.message);
  }

  return apiData(data);
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "contacts", "create");

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = createContactSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { data, error } = await auth.context.supabase
    .from("contacts")
    .insert({
      full_name: parsed.data.full_name,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      company_id: parsed.data.company_id ?? null,
      owner_id: resolveOwnerId(auth.context, parsed.data.owner_id),
      source: parsed.data.source ?? null,
    })
    .select("id,full_name,email,phone,company_id,owner_id,source,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel criar contato.", 400, error.message);
  }

  return apiData(data, { status: 201 });
}
