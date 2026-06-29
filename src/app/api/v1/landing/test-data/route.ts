import { apiData, apiError } from "@/lib/api/errors";
import { requireRole } from "@/lib/api/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

type LandingActivity = {
  entity_id: string;
  metadata: Json;
};

type LandingLead = {
  id: string;
  contact_id: string;
  converted_deal_id: string | null;
};

type LandingDeal = {
  id: string;
  contact_id: string;
  company_id: string | null;
};

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function convertedDealIdFrom(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = metadata.converted_deal_id;
  return typeof value === "string" ? value : null;
}

async function deleteRows(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  table: "activities" | "deal_products" | "integrations_state" | "tasks",
  column: string,
  values: string[],
) {
  if (values.length === 0) {
    return null;
  }

  const { error } = await supabase.from(table).delete().in(column, values);
  return error;
}

async function softDeleteRows(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  table: "companies" | "contacts" | "deals" | "leads",
  ids: string[],
  deletedAt: string,
) {
  if (ids.length === 0) {
    return null;
  }

  const { error } = await supabase
    .from(table)
    .update({ deleted_at: deletedAt })
    .in("id", ids);

  return error;
}

async function hasActiveLeadOrDealForContact(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  contactId: string,
) {
  const { count: leadCount, error: leadError } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", contactId)
    .is("deleted_at", null);

  if (leadError) {
    throw leadError;
  }

  const { count: dealCount, error: dealError } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", contactId)
    .is("deleted_at", null);

  if (dealError) {
    throw dealError;
  }

  return Boolean(leadCount || dealCount);
}

async function hasActiveContactOrDealForCompany(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  companyId: string,
) {
  const { count: contactCount, error: contactError } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (contactError) {
    throw contactError;
  }

  const { count: dealCount, error: dealError } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (dealError) {
    throw dealError;
  }

  return Boolean(contactCount || dealCount);
}

export async function DELETE(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  let supabase: ReturnType<typeof createSupabaseServiceClient>;

  try {
    supabase = createSupabaseServiceClient();
  } catch {
    return apiError("internal_error", "Supabase service role nao configurado.", 500);
  }

  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("entity_id,metadata")
    .eq("entity_type", "lead")
    .eq("action", "landing_infrastructure_form_submitted")
    .contains("metadata", {
      source: "landing_page",
      form: "infrastructure_personalization",
    });

  if (activitiesError) {
    return apiError(
      "bad_request",
      "Nao foi possivel localizar leads da landing.",
      400,
      activitiesError.message,
    );
  }

  const landingActivities = (activities ?? []) as LandingActivity[];
  const leadIds = unique(landingActivities.map((activity) => activity.entity_id));

  if (leadIds.length === 0) {
    return apiData({
      leads: 0,
      deals: 0,
      contacts: 0,
      companies: 0,
    });
  }

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id,contact_id,converted_deal_id")
    .in("id", leadIds);

  if (leadsError) {
    return apiError("bad_request", "Nao foi possivel carregar leads da landing.", 400, leadsError.message);
  }

  const landingLeads = (leads ?? []) as LandingLead[];
  const dealIds = unique([
    ...landingLeads.map((lead) => lead.converted_deal_id),
    ...landingActivities.map((activity) => convertedDealIdFrom(activity.metadata)),
  ]);

  const { data: deals, error: dealsError } =
    dealIds.length > 0
      ? await supabase.from("deals").select("id,contact_id,company_id").in("id", dealIds)
      : { data: [], error: null };

  if (dealsError) {
    return apiError(
      "bad_request",
      "Nao foi possivel carregar oportunidades da landing.",
      400,
      dealsError.message,
    );
  }

  const landingDeals = (deals ?? []) as LandingDeal[];
  const contactIds = unique([
    ...landingLeads.map((lead) => lead.contact_id),
    ...landingDeals.map((deal) => deal.contact_id),
  ]);
  const companyIds = unique(landingDeals.map((deal) => deal.company_id));
  const deletedAt = new Date().toISOString();

  const integrationLeadError = await deleteRows(
    supabase,
    "integrations_state",
    "entity_id",
    leadIds,
  );

  if (integrationLeadError) {
    return apiError(
      "bad_request",
      "Nao foi possivel limpar integracoes dos leads.",
      400,
      integrationLeadError.message,
    );
  }

  const integrationDealError = await deleteRows(
    supabase,
    "integrations_state",
    "entity_id",
    dealIds,
  );

  if (integrationDealError) {
    return apiError(
      "bad_request",
      "Nao foi possivel limpar integracoes das oportunidades.",
      400,
      integrationDealError.message,
    );
  }

  const leadTasksError = await deleteRows(supabase, "tasks", "related_entity_id", leadIds);

  if (leadTasksError) {
    return apiError("bad_request", "Nao foi possivel limpar tarefas dos leads.", 400, leadTasksError.message);
  }

  const dealTasksError = await deleteRows(supabase, "tasks", "related_entity_id", dealIds);

  if (dealTasksError) {
    return apiError(
      "bad_request",
      "Nao foi possivel limpar tarefas das oportunidades.",
      400,
      dealTasksError.message,
    );
  }

  const dealProductsError = await deleteRows(supabase, "deal_products", "deal_id", dealIds);

  if (dealProductsError) {
    return apiError(
      "bad_request",
      "Nao foi possivel limpar produtos das oportunidades.",
      400,
      dealProductsError.message,
    );
  }

  const dealDeleteError = await softDeleteRows(supabase, "deals", dealIds, deletedAt);

  if (dealDeleteError) {
    return apiError(
      "bad_request",
      "Nao foi possivel limpar oportunidades da landing.",
      400,
      dealDeleteError.message,
    );
  }

  const leadDeleteError = await softDeleteRows(supabase, "leads", leadIds, deletedAt);

  if (leadDeleteError) {
    return apiError("bad_request", "Nao foi possivel limpar leads da landing.", 400, leadDeleteError.message);
  }

  const leadActivityError = await deleteRows(supabase, "activities", "entity_id", leadIds);

  if (leadActivityError) {
    return apiError(
      "bad_request",
      "Leads removidos, mas nao foi possivel limpar atividades dos leads.",
      400,
      leadActivityError.message,
    );
  }

  const dealActivityError = await deleteRows(supabase, "activities", "entity_id", dealIds);

  if (dealActivityError) {
    return apiError(
      "bad_request",
      "Leads removidos, mas nao foi possivel limpar atividades das oportunidades.",
      400,
      dealActivityError.message,
    );
  }

  const contactsToDelete: string[] = [];

  for (const contactId of contactIds) {
    const hasActiveReferences = await hasActiveLeadOrDealForContact(supabase, contactId);

    if (!hasActiveReferences) {
      contactsToDelete.push(contactId);
    }
  }

  const contactDeleteError = await softDeleteRows(
    supabase,
    "contacts",
    contactsToDelete,
    deletedAt,
  );

  if (contactDeleteError) {
    return apiError(
      "bad_request",
      "Leads removidos, mas nao foi possivel limpar contatos orfaos.",
      400,
      contactDeleteError.message,
    );
  }

  const companiesToDelete: string[] = [];

  for (const companyId of companyIds) {
    const hasActiveReferences = await hasActiveContactOrDealForCompany(supabase, companyId);

    if (!hasActiveReferences) {
      companiesToDelete.push(companyId);
    }
  }

  const companyDeleteError = await softDeleteRows(
    supabase,
    "companies",
    companiesToDelete,
    deletedAt,
  );

  if (companyDeleteError) {
    return apiError(
      "bad_request",
      "Leads removidos, mas nao foi possivel limpar contas orfas.",
      400,
      companyDeleteError.message,
    );
  }

  return apiData({
    leads: leadIds.length,
    deals: dealIds.length,
    contacts: contactsToDelete.length,
    companies: companiesToDelete.length,
  });
}
