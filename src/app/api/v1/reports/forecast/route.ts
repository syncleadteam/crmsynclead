import { requireAuth } from "@/lib/api/auth";
import { apiData, apiError } from "@/lib/api/errors";
import { monthKey } from "@/lib/api/reports";

export async function GET(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { data, error } = await auth.context.supabase
    .from("deals")
    .select("id,value,expected_close_date,status")
    .is("deleted_at", null)
    .eq("status", "open")
    .order("expected_close_date", { ascending: true });

  if (error) {
    return apiError("bad_request", "Nao foi possivel gerar forecast.", 400, error.message);
  }

  const forecast = Object.values(
    (data ?? []).reduce<Record<string, { month: string; count: number; value: number }>>(
      (groups, deal) => {
        const key = monthKey(deal.expected_close_date);
        groups[key] ??= { month: key, count: 0, value: 0 };
        groups[key].count += 1;
        groups[key].value += deal.value;
        return groups;
      },
      {},
    ),
  );

  return apiData(forecast);
}
