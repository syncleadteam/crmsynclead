import { requireAuth } from "@/lib/api/auth";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { createCompanySchema } from "@/lib/api/schemas";
import { listLimit, resolveOwnerId } from "@/lib/api/ownership";

export async function GET(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  let query = auth.context.supabase
    .from("companies")
    .select("id,name,document_number,segment,owner_id,created_at,updated_at,owner:users!companies_owner_id_fkey(id,email,full_name,role)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(listLimit(request));

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar empresas.", 400, error.message);
  }

  return apiData(data);
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = createCompanySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { data, error } = await auth.context.supabase
    .from("companies")
    .insert({
      name: parsed.data.name,
      document_number: parsed.data.document_number ?? null,
      segment: parsed.data.segment ?? null,
      owner_id: resolveOwnerId(auth.context, parsed.data.owner_id),
    })
    .select("id,name,document_number,segment,owner_id,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel criar empresa.", 400, error.message);
  }

  return apiData(data, { status: 201 });
}
