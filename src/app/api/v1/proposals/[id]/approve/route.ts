import { requireAuth } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { apiData, apiError } from "@/lib/api/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const { data: current, error: currentError } = await auth.context.supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();

  if (currentError || !current) {
    return apiError("not_found", "Proposta nao encontrada.", 404);
  }

  if (current.status === "approved") {
    return apiData(current);
  }

  const { data, error } = await auth.context.supabase
    .from("proposals")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,deal_id,version,status,title,content,total_value,pdf_url,approved_at,created_by,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel aprovar proposta.", 400, error.message);
  }

  await writeAuditLog(auth.context, {
    action: "approve_proposal",
    target_table: "proposals",
    target_id: id,
    before: current,
    after: data,
  });

  return apiData(data);
}
