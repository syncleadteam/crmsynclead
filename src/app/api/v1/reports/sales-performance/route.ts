import { requireAuth } from "@/lib/api/auth";
import { apiData, apiError } from "@/lib/api/errors";
import { parsePeriod } from "@/lib/api/reports";

export async function GET(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { sinceIso } = parsePeriod(request);

  const { data, error } = await auth.context.supabase
    .from("deals")
    .select("id,value,status,owner_id,owner:users!deals_owner_id_fkey(id,email,full_name),created_at,closed_at")
    .is("deleted_at", null)
    .gte("created_at", sinceIso);

  if (error) {
    return apiError("bad_request", "Nao foi possivel gerar performance.", 400, error.message);
  }

  const performance = Object.values(
    (data ?? []).reduce<
      Record<
        string,
        {
          owner_id: string;
          owner_name: string;
          won_count: number;
          open_count: number;
          won_value: number;
        }
      >
    >((groups, deal) => {
      const owner = Array.isArray(deal.owner) ? deal.owner[0] : deal.owner;
      groups[deal.owner_id] ??= {
        owner_id: deal.owner_id,
        owner_name: owner?.full_name ?? owner?.email ?? "Sem owner",
        won_count: 0,
        open_count: 0,
        won_value: 0,
      };

      if (deal.status === "won") {
        groups[deal.owner_id].won_count += 1;
        groups[deal.owner_id].won_value += deal.value;
      }

      if (deal.status === "open") {
        groups[deal.owner_id].open_count += 1;
      }

      return groups;
    }, {}),
  ).sort((a, b) => b.won_value - a.won_value);

  return apiData(performance);
}
