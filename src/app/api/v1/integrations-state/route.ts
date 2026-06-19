import { requireAuth } from "@/lib/api/auth";
import { apiData, apiError } from "@/lib/api/errors";
import { listLimit } from "@/lib/api/ownership";

export async function GET(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");

  let query = auth.context.supabase
    .from("integrations_state")
    .select("id,provider,entity_type,entity_id,external_id,status,metadata,last_synced_at,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(listLimit(request));

  if (provider) {
    query = query.eq("provider", provider);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar integracoes.", 400, error.message);
  }

  return apiData(data);
}
