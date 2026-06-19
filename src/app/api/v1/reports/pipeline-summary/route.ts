import { requireAuth } from "@/lib/api/auth";
import { apiData, apiError } from "@/lib/api/errors";
import { parsePeriod } from "@/lib/api/reports";

export async function GET(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { sinceIso } = parsePeriod(request);

  const [dealsResult, leadsResult, activitiesResult] = await Promise.all([
    auth.context.supabase
      .from("deals")
      .select("id,value,status,stage:pipeline_stages(id,name,position),owner:users!deals_owner_id_fkey(id,email,full_name),created_at")
      .is("deleted_at", null),
    auth.context.supabase
      .from("leads")
      .select("id,status,created_at")
      .is("deleted_at", null)
      .gte("created_at", sinceIso),
    auth.context.supabase
      .from("activities")
      .select("id,entity_type,entity_id,action,created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (dealsResult.error) {
    return apiError("bad_request", "Nao foi possivel agregar deals.", 400, dealsResult.error.message);
  }

  if (leadsResult.error) {
    return apiError("bad_request", "Nao foi possivel agregar leads.", 400, leadsResult.error.message);
  }

  if (activitiesResult.error) {
    return apiError("bad_request", "Nao foi possivel listar atividades.", 400, activitiesResult.error.message);
  }

  const deals = dealsResult.data ?? [];
  const openDeals = deals.filter((deal) => deal.status === "open");
  const wonDeals = deals.filter((deal) => deal.status === "won");
  const lostDeals = deals.filter((deal) => deal.status === "lost");
  const totalPipelineValue = openDeals.reduce((sum, deal) => sum + deal.value, 0);
  const averageTicket = wonDeals.length
    ? wonDeals.reduce((sum, deal) => sum + deal.value, 0) / wonDeals.length
    : 0;
  const winRate =
    wonDeals.length + lostDeals.length > 0
      ? wonDeals.length / (wonDeals.length + lostDeals.length)
      : 0;

  const byStage = Object.values(
    deals.reduce<
      Record<
        string,
        {
          stage_id: string;
          stage_name: string;
          position: number;
          count: number;
          value: number;
        }
      >
    >((groups, deal) => {
      const stage = Array.isArray(deal.stage) ? deal.stage[0] : deal.stage;
      const key = stage?.id ?? "unknown";
      groups[key] ??= {
        stage_id: key,
        stage_name: stage?.name ?? "Sem etapa",
        position: stage?.position ?? 999,
        count: 0,
        value: 0,
      };
      groups[key].count += 1;
      groups[key].value += deal.value;
      return groups;
    }, {}),
  ).sort((a, b) => a.position - b.position);

  const leads = leadsResult.data ?? [];
  const convertedLeads = leads.filter((lead) => lead.status === "converted").length;
  const qualifiedLeads = leads.filter((lead) => lead.status === "qualified").length;

  return apiData({
    metrics: {
      open_deals: openDeals.length,
      total_pipeline_value: totalPipelineValue,
      average_ticket: averageTicket,
      win_rate: winRate,
      leads_created: leads.length,
      leads_qualified: qualifiedLeads,
      leads_converted: convertedLeads,
    },
    by_stage: byStage,
    recent_activities: activitiesResult.data ?? [],
  });
}
