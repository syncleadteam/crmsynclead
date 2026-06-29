import { apiData, apiError } from "@/lib/api/errors";
import { requirePermission } from "@/lib/api/permissions";

type QueryResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};
type LooseQuery = PromiseLike<QueryResult> & {
  select(columns: string): LooseQuery;
  order(column: string, options: { ascending: boolean }): LooseQuery;
  limit(value: number): LooseQuery;
  eq(column: string, value: string): LooseQuery;
};

export async function GET(request: Request) {
  const auth = await requirePermission(request, "automations", "view");

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 30), 100);
  const status = searchParams.get("status");
  const db = auth.context.supabase as unknown as { from(table: string): LooseQuery };

  let query = db
    .from("integration_events")
    .select("id,event_type,entity_type,entity_id,responsible_user_id,status,attempts,max_attempts,next_attempt_at,last_error,delivered_at,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar eventos.", 400, error.message);
  }

  return apiData(data ?? []);
}
