import { requireAuth, requireRole } from "@/lib/api/auth";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { listLimit } from "@/lib/api/ownership";
import { createProductSchema } from "@/lib/api/schemas";

export async function GET(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const landingForm = searchParams.get("landing_form");

  let query = auth.context.supabase
    .from("products")
    .select("id,name,description,sku,unit_price,is_active,landing_form_code,landing_form_category,landing_form_position,landing_form_required_agents,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(listLimit(request));

  if (landingForm === "true") {
    query = query.not("landing_form_code", "is", null);
  }

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar produtos.", 400, error.message);
  }

  return apiData(data);
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = createProductSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { data, error } = await auth.context.supabase
    .from("products")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      sku: parsed.data.sku ?? null,
      unit_price: parsed.data.unit_price,
      is_active: parsed.data.is_active,
      landing_form_code: parsed.data.landing_form_code ?? null,
      landing_form_category: parsed.data.landing_form_category ?? null,
      landing_form_position: parsed.data.landing_form_position,
      landing_form_required_agents: parsed.data.landing_form_required_agents,
    })
    .select("id,name,description,sku,unit_price,is_active,landing_form_code,landing_form_category,landing_form_position,landing_form_required_agents,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel criar produto.", 400, error.message);
  }

  return apiData(data, { status: 201 });
}
