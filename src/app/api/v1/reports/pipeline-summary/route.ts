import { requireAuth } from "@/lib/api/auth";
import { apiData, apiError } from "@/lib/api/errors";
import { parsePeriod } from "@/lib/api/reports";

export async function GET(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { sinceIso } = parsePeriod(request);

  const [dealsResult, leadsResult, activitiesResult, proposalsResult, dealProductsResult] = await Promise.all([
    auth.context.supabase
      .from("deals")
      .select("id,value,status,stage:pipeline_stages(id,name,position),owner:users!deals_owner_id_fkey(id,email,full_name),created_at")
      .is("deleted_at", null),
    auth.context.supabase
      .from("leads")
      .select("id,status,created_at,contact:contacts(source)")
      .is("deleted_at", null)
      .gte("created_at", sinceIso),
    auth.context.supabase
      .from("activities")
      .select("id,entity_type,entity_id,action,metadata,created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(50),
    auth.context.supabase
      .from("proposals")
      .select("id,status,created_at")
      .gte("created_at", sinceIso),
    auth.context.supabase
      .from("deal_products")
      .select("id,quantity,total_amount,product:products(id,name,landing_form_category)")
      .gte("created_at", sinceIso),
  ]);

  if (dealsResult.error) {
    return apiError("bad_request", "Nao foi possivel consolidar oportunidades.", 400, dealsResult.error.message);
  }

  if (leadsResult.error) {
    return apiError("bad_request", "Nao foi possivel agregar leads.", 400, leadsResult.error.message);
  }

  if (activitiesResult.error) {
    return apiError("bad_request", "Nao foi possivel listar atividades.", 400, activitiesResult.error.message);
  }

  if (proposalsResult.error) {
    return apiError("bad_request", "Nao foi possivel consolidar propostas.", 400, proposalsResult.error.message);
  }

  if (dealProductsResult.error) {
    return apiError("bad_request", "Nao foi possivel consolidar produtos.", 400, dealProductsResult.error.message);
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
  const proposals = proposalsResult.data ?? [];
  const activities = activitiesResult.data ?? [];
  const leadsBySource = Object.values(
    leads.reduce<Record<string, { source: string; count: number }>>((groups, lead) => {
      const contact = Array.isArray(lead.contact) ? lead.contact[0] : lead.contact;
      const source = contact?.source ?? "CRM";
      groups[source] ??= { source, count: 0 };
      groups[source].count += 1;
      return groups;
    }, {}),
  ).sort((a, b) => b.count - a.count);

  const requestedProducts = new Map<string, { name: string; count: number; value: number; source: string }>();

  for (const activity of activities) {
    if (activity.action !== "landing_infrastructure_form_submitted") continue;
    const metadata = activity.metadata as { modules?: Array<{ code?: string; name?: string; price?: number }> };

    for (const moduleItem of metadata.modules ?? []) {
      const key = moduleItem.code ?? moduleItem.name ?? "produto";
      const current = requestedProducts.get(key) ?? {
        name: moduleItem.name ?? key,
        count: 0,
        value: 0,
        source: "landing",
      };
      current.count += 1;
      current.value += Number(moduleItem.price ?? 0);
      requestedProducts.set(key, current);
    }
  }

  for (const item of dealProductsResult.data ?? []) {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    const key = product?.id ?? item.id;
    const current = requestedProducts.get(key) ?? {
      name: product?.name ?? "Produto em oportunidade",
      count: 0,
      value: 0,
      source: "oportunidade",
    };
    current.count += Number(item.quantity ?? 0);
    current.value += Number(item.total_amount ?? 0);
    requestedProducts.set(key, current);
  }

  const topProducts = Array.from(requestedProducts.values())
    .sort((a, b) => b.count - a.count || b.value - a.value)
    .slice(0, 8);
  const conversion = {
    leads: leads.length,
    qualified: qualifiedLeads,
    opportunities: convertedLeads + openDeals.length + wonDeals.length + lostDeals.length,
    proposals: proposals.length,
    won: wonDeals.length,
    landing_to_qualified_rate: leads.length ? qualifiedLeads / leads.length : 0,
    lead_to_opportunity_rate: leads.length ? convertedLeads / leads.length : 0,
    proposal_to_win_rate: proposals.length ? wonDeals.length / proposals.length : 0,
  };

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
    leads_by_source: leadsBySource,
    top_products: topProducts,
    conversion,
    recent_activities: activities.slice(0, 8),
  });
}
