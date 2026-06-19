import { requireAuth, requireRole } from "@/lib/api/auth";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { createPipelineStageSchema } from "@/lib/api/schemas";

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
    .from("pipeline_stages")
    .select("id,pipeline_id,name,position,probability,is_won_stage,is_lost_stage,created_at,updated_at")
    .eq("pipeline_id", id)
    .order("position", { ascending: true });

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar etapas.", 400, error.message);
  }

  return apiData(data);
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const parsed = createPipelineStageSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { data, error } = await auth.context.supabase
    .from("pipeline_stages")
    .insert({
      pipeline_id: id,
      ...parsed.data,
    })
    .select("id,pipeline_id,name,position,probability,is_won_stage,is_lost_stage,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel criar etapa.", 400, error.message);
  }

  return apiData(data, { status: 201 });
}
