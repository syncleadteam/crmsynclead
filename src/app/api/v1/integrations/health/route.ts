import { apiData, apiError } from "@/lib/api/errors";
import { checkN8nApiHealth } from "@/lib/api/n8n-health";
import { requirePermission } from "@/lib/api/permissions";

type LooseSupabase = {
  from(table: string): LooseQuery;
};
type QueryResult<T = unknown> = {
  data: T | null;
  error: { message: string } | null;
  count?: number | null;
};
type LooseQuery<T = unknown> = PromiseLike<QueryResult<T>> & {
  select(columns: string, options?: { count?: "exact"; head?: boolean }): LooseQuery<T>;
  eq(column: string, value: string): LooseQuery<T>;
  in(column: string, values: string[]): LooseQuery<T>;
  order(column: string, options: { ascending: boolean }): LooseQuery<T>;
  limit(value: number): LooseQuery<T>;
};

async function countByStatus(db: LooseSupabase, table: string, statuses: string[]) {
  const output: Record<string, number> = {};

  for (const status of statuses) {
    const { count } = await db
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    output[status] = count ?? 0;
  }

  return output;
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "automations", "view");

  if (!auth.ok) {
    return auth.response;
  }

  const db = auth.context.supabase as unknown as LooseSupabase;
  const [crmToN8n, n8nToCrm, recentFailures, recentSyncs, n8n] = await Promise.all([
    countByStatus(db, "integration_events", ["pending", "processing", "delivered", "failed", "dead"]),
    countByStatus(db, "n8n_sync_events", ["processed", "failed"]),
    db
      .from("integration_events")
      .select("id,event_type,entity_type,entity_id,status,last_error,created_at,updated_at")
      .in("status", ["failed", "dead"])
      .order("updated_at", { ascending: false })
      .limit(10),
    db
      .from("n8n_sync_events")
      .select("id,event_type,entity_type,entity_id,external_id,status,error_message,processed_at")
      .order("processed_at", { ascending: false })
      .limit(10),
    checkN8nApiHealth(),
  ]);

  if (recentFailures.error || recentSyncs.error) {
    return apiError("bad_request", "Nao foi possivel consultar saude da integracao.", 400, {
      failures: recentFailures.error?.message,
      syncs: recentSyncs.error?.message,
    });
  }

  return apiData({
    ok: n8n.ok && (crmToN8n.failed ?? 0) === 0 && (crmToN8n.dead ?? 0) === 0 && (n8nToCrm.failed ?? 0) === 0,
    checked_at: new Date().toISOString(),
    n8n,
    crm_to_n8n: crmToN8n,
    n8n_to_crm: n8nToCrm,
    recent_failures: recentFailures.data ?? [],
    recent_syncs: recentSyncs.data ?? [],
  });
}
