import { requireAuth, requireRole } from "@/lib/api/auth";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { createPipelineSchema } from "@/lib/api/schemas";

export async function GET(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { data, error } = await auth.context.supabase
    .from("pipelines")
    .select("id,name,description,is_active,created_at,updated_at,pipeline_stages(id,name,position,probability,is_won_stage,is_lost_stage)")
    .order("created_at", { ascending: false });

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar funis.", 400, error.message);
  }

  return apiData(data);
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = createPipelineSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { data, error } = await auth.context.supabase
    .from("pipelines")
    .insert(parsed.data)
    .select("id,name,description,is_active,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel criar funil.", 400, error.message);
  }

  return apiData(data, { status: 201 });
}
