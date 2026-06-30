import { z } from "zod";

import { requireRole } from "@/lib/api/auth";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

const cleanupScopeSchema = z.enum([
  "landing",
  "agenda",
  "integration_logs",
  "crm_operational",
]);

const cleanupRequestSchema = z.object({
  scope: cleanupScopeSchema,
});

type CleanupScope = z.infer<typeof cleanupScopeSchema>;
type SupabaseService = ReturnType<typeof createSupabaseServiceClient>;
type DynamicSupabaseService = {
  from: (table: string) => {
    select: (
      columns: string,
      options: { count: "exact"; head: true },
    ) => PromiseLike<{ count: number | null; error: Error | null }>;
    delete: () => {
      not: (
        column: string,
        operator: string,
        value: unknown,
      ) => PromiseLike<{ error: Error | null }>;
    };
  };
};
type OperationalTable =
  | "integration_event_deliveries"
  | "integration_events"
  | "n8n_sync_events"
  | "integrations_state"
  | "tasks"
  | "audit_logs"
  | "proposals"
  | "deal_products"
  | "activities"
  | "leads"
  | "deals"
  | "contacts"
  | "companies";
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

const countTables = [
  "companies",
  "contacts",
  "leads",
  "deals",
  "tasks",
  "activities",
  "proposals",
  "deal_products",
  "integration_events",
  "integration_event_deliveries",
  "integrations_state",
  "n8n_sync_events",
] as const;

async function countRows(supabase: SupabaseService, table: (typeof countTables)[number]) {
  const { count, error } = await (supabase as unknown as DynamicSupabaseService)
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function summary(supabase: SupabaseService) {
  const entries = await Promise.all(
    countTables.map(async (table) => [table, await countRows(supabase, table)] as const),
  );

  return Object.fromEntries(entries);
}

async function deleteTableRows(
  supabase: SupabaseService,
  table: OperationalTable,
) {
  const { error } = await (supabase as unknown as DynamicSupabaseService)
    .from(table)
    .delete()
    .not("id", "is", null);
  return error;
}

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
  supabase: SupabaseService,
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
  supabase: SupabaseService,
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
  supabase: SupabaseService,
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
  supabase: SupabaseService,
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

async function clearIntegrationLogs(supabase: SupabaseService) {
  for (const table of [
    "integration_event_deliveries",
    "integration_events",
    "n8n_sync_events",
    "integrations_state",
  ] as const) {
    const error = await deleteTableRows(supabase, table);

    if (error) {
      return error;
    }
  }

  return null;
}

async function clearAgenda(supabase: SupabaseService) {
  const { error } = await supabase.from("tasks").delete().not("id", "is", null);
  return error;
}

async function clearCrmOperationalData(supabase: SupabaseService) {
  const integrationError = await clearIntegrationLogs(supabase);

  if (integrationError) {
    return integrationError;
  }

  for (const table of [
    "tasks",
    "audit_logs",
    "proposals",
    "deal_products",
    "activities",
    "leads",
    "deals",
    "contacts",
    "companies",
  ] as const) {
    const error = await deleteTableRows(supabase, table);

    if (error) {
      return error;
    }
  }

  return null;
}

async function clearLandingData(supabase: SupabaseService) {
  const { data: landingLeadActivities, error: activitiesError } = await supabase
    .from("activities")
    .select("entity_id,metadata")
    .eq("entity_type", "lead")
    .eq("action", "landing_infrastructure_form_submitted")
    .contains("metadata", {
      source: "landing_page",
      form: "infrastructure_personalization",
    });

  if (activitiesError) {
    return activitiesError;
  }

  const landingActivities = (landingLeadActivities ?? []) as LandingActivity[];
  const leadIds = unique(landingActivities.map((activity) => activity.entity_id));

  if (leadIds.length === 0) {
    return null;
  }

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id,contact_id,converted_deal_id")
    .in("id", leadIds);

  if (leadsError) {
    return leadsError;
  }

  const landingLeads = (leads ?? []) as LandingLead[];
  const dealIds = unique([
    ...landingLeads.map((lead) => lead.converted_deal_id),
    ...landingActivities.map((activity) => convertedDealIdFrom(activity.metadata)),
  ]);
  const contactIdsFromLeads = landingLeads.map((lead) => lead.contact_id);

  const { data: deals, error: dealsError } =
    dealIds.length > 0
      ? await supabase.from("deals").select("id,contact_id,company_id").in("id", dealIds)
      : { data: [], error: null };

  if (dealsError) {
    return dealsError;
  }

  const landingDeals = (deals ?? []) as LandingDeal[];
  const contactIds = unique([
    ...contactIdsFromLeads,
    ...landingDeals.map((deal) => deal.contact_id),
  ]);
  const companyIds = unique(landingDeals.map((deal) => deal.company_id));

  for (const [table, column, ids] of [
    ["integrations_state", "entity_id", [...leadIds, ...dealIds]],
    ["tasks", "related_entity_id", [...leadIds, ...dealIds]],
    ["deal_products", "deal_id", dealIds],
    ["activities", "entity_id", [...leadIds, ...dealIds]],
  ] as const) {
    const error = await deleteRows(supabase, table, column, ids);

    if (error) {
      return error;
    }
  }

  const deletedAt = new Date().toISOString();
  const dealDeleteError = await softDeleteRows(supabase, "deals", dealIds, deletedAt);

  if (dealDeleteError) {
    return dealDeleteError;
  }

  const leadDeleteError = await softDeleteRows(supabase, "leads", leadIds, deletedAt);

  if (leadDeleteError) {
    return leadDeleteError;
  }

  const contactsToDelete: string[] = [];

  for (const contactId of contactIds) {
    if (!(await hasActiveLeadOrDealForContact(supabase, contactId))) {
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
    return contactDeleteError;
  }

  const companiesToDelete: string[] = [];

  for (const companyId of companyIds) {
    if (!(await hasActiveContactOrDealForCompany(supabase, companyId))) {
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
    return companyDeleteError;
  }

  return null;
}

async function runCleanup(supabase: SupabaseService, scope: CleanupScope) {
  if (scope === "landing") {
    return clearLandingData(supabase);
  }

  if (scope === "agenda") {
    return clearAgenda(supabase);
  }

  if (scope === "integration_logs") {
    return clearIntegrationLogs(supabase);
  }

  return clearCrmOperationalData(supabase);
}

function createServiceClient() {
  try {
    return createSupabaseServiceClient();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const supabase = createServiceClient();

  if (!supabase) {
    return apiError("internal_error", "Supabase service role nao configurado.", 500);
  }

  try {
    return apiData(await summary(supabase));
  } catch (error) {
    return apiError(
      "bad_request",
      "Nao foi possivel carregar o resumo dos dados.",
      400,
      error instanceof Error ? error.message : undefined,
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireRole(request, ["admin"]);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = cleanupRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = createServiceClient();

  if (!supabase) {
    return apiError("internal_error", "Supabase service role nao configurado.", 500);
  }

  const before = await summary(supabase);
  const error = await runCleanup(supabase, parsed.data.scope);

  if (error) {
    return apiError(
      "bad_request",
      "Nao foi possivel concluir a limpeza solicitada.",
      400,
      error.message,
    );
  }

  return apiData({
    scope: parsed.data.scope,
    before,
    after: await summary(supabase),
  });
}
