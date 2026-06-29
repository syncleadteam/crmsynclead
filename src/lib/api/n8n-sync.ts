/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/supabase";

type ServiceClient = SupabaseClient<Database>;
type LooseSupabase = {
  from(table: string): any;
};

export type N8nSyncPayload = {
  event_type: string;
  entity_type?: "lead" | "deal" | "contact" | "company" | "meeting" | "task";
  entity_id?: string;
  external_id?: string;
  idempotency_key?: string;
  data?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

type TouchedEntity = {
  entity_type: string;
  entity_id: string;
};

type SyncResult = {
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  external_id: string | null;
  action: string;
};

const activityEntityTypes = new Set(["lead", "deal", "contact", "company"]);
const leadStatuses = new Set(["new", "contacted", "qualified", "disqualified", "converted"]);
const taskStatuses = new Set(["pending", "completed", "canceled"]);

function dataOf(payload: N8nSyncPayload) {
  return (payload.data ?? payload.payload ?? {}) as Record<string, any>;
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

async function defaultOwnerId(db: LooseSupabase, data: Record<string, any>) {
  if (typeof data.owner_id === "string") {
    return data.owner_id;
  }

  if (typeof data.responsible_user_id === "string") {
    return data.responsible_user_id;
  }

  const { data: user } = await db
    .from("users")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return user?.id as string | undefined;
}

async function upsertCompany(db: LooseSupabase, ownerId: string, data: Record<string, any>) {
  const company = data.company ?? {};
  const companyId = data.company_id ?? company.id;
  const name = company.name ?? data.company_name;

  if (!companyId && !name) {
    return null;
  }

  const values = compact({
    id: companyId,
    name: name ?? "Conta criada pelo N8N",
    document_number: company.document_number ?? data.document_number ?? null,
    segment: company.segment ?? data.segment ?? null,
    owner_id: company.owner_id ?? ownerId,
  });

  const query = companyId
    ? db.from("companies").upsert(values).select("id").single()
    : db.from("companies").insert(values).select("id").single();
  const { data: saved, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return saved.id as string;
}

async function upsertContact(
  db: LooseSupabase,
  ownerId: string,
  data: Record<string, any>,
  companyId: string | null,
) {
  const contact = data.contact ?? {};
  const contactId = data.contact_id ?? contact.id;
  const email = contact.email ?? data.email ?? null;
  const phone = contact.phone ?? data.phone ?? data.whatsapp ?? null;
  const fullName = contact.full_name ?? contact.name ?? data.full_name ?? data.name;

  if (contactId) {
    const { data: saved, error } = await db
      .from("contacts")
      .upsert(
        compact({
          id: contactId,
          full_name: fullName ?? "Lead criado pelo N8N",
          email,
          phone,
          company_id: companyId ?? contact.company_id ?? data.company_id ?? null,
          owner_id: contact.owner_id ?? data.owner_id ?? ownerId,
          source: contact.source ?? data.source ?? "n8n",
        }),
      )
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return saved.id as string;
  }

  const match = email
    ? db.from("contacts").select("id").eq("email", email).maybeSingle()
    : phone
      ? db.from("contacts").select("id").eq("phone", phone).maybeSingle()
      : null;

  if (match) {
    const { data: existing } = await match;

    if (existing?.id) {
      const { error } = await db
        .from("contacts")
        .update(compact({ full_name: fullName, company_id: companyId ?? undefined, source: "n8n" }))
        .eq("id", existing.id);

      if (error) {
        throw new Error(error.message);
      }

      return existing.id as string;
    }
  }

  const { data: saved, error } = await db
    .from("contacts")
    .insert({
      full_name: fullName ?? "Lead criado pelo N8N",
      email,
      phone,
      company_id: companyId,
      owner_id: ownerId,
      source: data.source ?? "n8n",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return saved.id as string;
}

async function upsertLead(db: LooseSupabase, ownerId: string, data: Record<string, any>, contactId: string) {
  const lead = data.lead ?? {};
  const leadId = data.lead_id ?? lead.id;
  const status = leadStatuses.has(lead.status ?? data.status) ? (lead.status ?? data.status) : "new";
  const score = Number.isFinite(Number(lead.score ?? data.score)) ? Number(lead.score ?? data.score) : 0;

  if (leadId) {
    const { data: saved, error } = await db
      .from("leads")
      .upsert(
        compact({
          id: leadId,
          contact_id: contactId,
          status,
          score,
          disqualification_reason: lead.disqualification_reason ?? data.disqualification_reason ?? null,
          owner_id: lead.owner_id ?? data.owner_id ?? ownerId,
        }),
      )
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return saved.id as string;
  }

  const { data: existing } = await db
    .from("leads")
    .select("id")
    .eq("contact_id", contactId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await db
      .from("leads")
      .update({
        status,
        score,
        disqualification_reason: lead.disqualification_reason ?? data.disqualification_reason ?? null,
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }

    return existing.id as string;
  }

  const { data: saved, error } = await db
    .from("leads")
    .insert({
      contact_id: contactId,
      status,
      score,
      disqualification_reason: lead.disqualification_reason ?? data.disqualification_reason ?? null,
      owner_id: ownerId,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return saved.id as string;
}

async function upsertIntegrationState(
  db: LooseSupabase,
  provider: string,
  entityType: string,
  entityId: string,
  externalId: string | null,
  status: string,
  metadata: Json,
) {
  if (!activityEntityTypes.has(entityType)) {
    return;
  }

  const { error } = await db.from("integrations_state").upsert(
    {
      provider,
      entity_type: entityType,
      entity_id: entityId,
      external_id: externalId,
      status,
      metadata,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "provider,entity_type,entity_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function createActivity(db: LooseSupabase, entityType: string, entityId: string, action: string, metadata: Json) {
  if (!activityEntityTypes.has(entityType)) {
    return;
  }

  const { error } = await db.from("activities").insert({
    entity_type: entityType,
    entity_id: entityId,
    actor_type: "n8n",
    actor_id: null,
    action,
    metadata,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function syncLeadCreated(db: LooseSupabase, payload: N8nSyncPayload, touched: TouchedEntity[]) {
  const data = dataOf(payload);
  const ownerId = await defaultOwnerId(db, data);

  if (!ownerId) {
    throw new Error("Nenhum usuario ativo encontrado para assumir o lead.");
  }

  const companyId = await upsertCompany(db, ownerId, data);
  const contactId = await upsertContact(db, ownerId, data, companyId);
  const leadId = await upsertLead(db, ownerId, data, contactId);

  touched.push({ entity_type: "contact", entity_id: contactId }, { entity_type: "lead", entity_id: leadId });

  if (companyId) {
    touched.push({ entity_type: "company", entity_id: companyId });
  }

  await upsertIntegrationState(db, "n8n", "lead", leadId, payload.external_id ?? data.external_id ?? null, "synced", data as Json);
  await createActivity(db, "lead", leadId, "n8n_lead_created", data as Json);

  return { entity_type: "lead", entity_id: leadId, action: "lead_upserted" };
}

async function syncStatus(db: LooseSupabase, payload: N8nSyncPayload, touched: TouchedEntity[]) {
  const data = dataOf(payload);
  const entityType = payload.entity_type ?? data.entity_type;
  const entityId = payload.entity_id ?? data.entity_id ?? data.lead_id ?? data.deal_id;
  const status = data.status;

  if (!entityType || !entityId || typeof status !== "string") {
    throw new Error("Payload de status sem entity_type, entity_id ou status.");
  }

  if (entityType === "lead") {
    if (!leadStatuses.has(status)) {
      throw new Error("Status de lead invalido.");
    }

    const { error } = await db.from("leads").update({ status }).eq("id", entityId);
    if (error) {
      throw new Error(error.message);
    }
  } else if (entityType === "deal") {
    const { error } = await db.from("deals").update({ status }).eq("id", entityId);
    if (error) {
      throw new Error(error.message);
    }
  }

  touched.push({ entity_type: entityType, entity_id: entityId });
  await createActivity(db, entityType, entityId, "n8n_status_changed", data as Json);

  return { entity_type: entityType, entity_id: entityId, action: "status_updated" };
}

async function syncMeeting(db: LooseSupabase, payload: N8nSyncPayload, touched: TouchedEntity[]) {
  const data = dataOf(payload);
  const externalId = payload.external_id ?? data.external_calendar_event_id ?? data.google_event_id ?? data.event_id;
  const status = payload.event_type.includes("cancel") ? "canceled" : taskStatuses.has(data.status) ? data.status : "pending";
  const relatedEntityType = data.related_entity_type ?? data.entity_type ?? "lead";
  const relatedEntityId = data.related_entity_id ?? payload.entity_id ?? data.entity_id ?? data.lead_id ?? data.deal_id;
  const ownerId = await defaultOwnerId(db, data);

  if (!externalId || !relatedEntityId || !ownerId || !activityEntityTypes.has(relatedEntityType)) {
    throw new Error("Payload de reuniao sem external_id, entidade relacionada ou responsavel.");
  }

  const existingQuery = db.from("tasks").select("id").eq("external_calendar_event_id", externalId).maybeSingle();
  const { data: existing } = await existingQuery;
  const values = {
    title: data.title ?? data.summary ?? "Reuniao criada pelo Google Calendar",
    type: "meeting",
    related_entity_type: relatedEntityType,
    related_entity_id: relatedEntityId,
    due_at: data.due_at ?? data.start_at ?? data.start?.dateTime ?? new Date().toISOString(),
    status,
    assigned_to: data.assigned_to ?? ownerId,
    external_calendar_event_id: externalId,
    canceled_at: status === "canceled" ? new Date().toISOString() : null,
  };

  const query = existing?.id
    ? db.from("tasks").update(values).eq("id", existing.id).select("id").single()
    : db.from("tasks").insert(values).select("id").single();
  const { data: task, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  touched.push({ entity_type: "task", entity_id: task.id }, { entity_type: relatedEntityType, entity_id: relatedEntityId });
  await upsertIntegrationState(db, "google_calendar", relatedEntityType, relatedEntityId, externalId, status, data as Json);
  await createActivity(db, relatedEntityType, relatedEntityId, `n8n_${payload.event_type.replaceAll(".", "_")}`, data as Json);

  return { entity_type: "task", entity_id: task.id as string, action: existing?.id ? "meeting_updated" : "meeting_created" };
}

async function syncActivity(db: LooseSupabase, payload: N8nSyncPayload) {
  const data = dataOf(payload);
  const entityType = payload.entity_type ?? data.entity_type;
  const entityId = payload.entity_id ?? data.entity_id ?? data.lead_id ?? data.deal_id ?? data.contact_id ?? data.company_id;

  if (!entityType || !entityId) {
    throw new Error("Payload de atividade sem entidade.");
  }

  const action = data.action ?? `n8n_${payload.event_type.replaceAll(".", "_")}`;
  await createActivity(db, entityType, entityId, action, data as Json);

  return { entity_type: entityType, entity_id: entityId, action };
}

async function suppressEchoEvents(db: LooseSupabase, touched: TouchedEntity[], startedAt: string) {
  for (const entity of touched) {
    await db
      .from("integration_events")
      .update({
        direction: "n8n_to_crm",
        source: "n8n",
        status: "delivered",
        delivered_at: new Date().toISOString(),
        last_error: "suppressed_echo",
      })
      .eq("entity_type", entity.entity_type)
      .eq("entity_id", entity.entity_id)
      .eq("status", "pending")
      .gte("created_at", startedAt);
  }
}

export async function processN8nSyncEvent(supabase: ServiceClient, payload: N8nSyncPayload): Promise<SyncResult> {
  const db = supabase as unknown as LooseSupabase;
  const startedAt = new Date().toISOString();
  const touched: TouchedEntity[] = [];
  const idempotencyKey =
    payload.idempotency_key ??
    `${payload.event_type}:${payload.external_id ?? payload.entity_id ?? JSON.stringify(dataOf(payload)).slice(0, 160)}`;

  const { data: existing } = await db
    .from("n8n_sync_events")
    .select("entity_type,entity_id,external_id,status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing?.status === "processed") {
    return {
      event_type: payload.event_type,
      entity_type: existing.entity_type,
      entity_id: existing.entity_id,
      external_id: existing.external_id,
      action: "duplicate_ignored",
    };
  }

  let result: { entity_type: string; entity_id: string; action: string };

  try {
    if (payload.event_type === "lead.created" || payload.event_type === "lead.upserted") {
      result = await syncLeadCreated(db, payload, touched);
    } else if (payload.event_type.includes("status")) {
      result = await syncStatus(db, payload, touched);
    } else if (payload.event_type.includes("meeting") || payload.event_type.includes("calendar")) {
      result = await syncMeeting(db, payload, touched);
    } else {
      result = await syncActivity(db, payload);
      touched.push({ entity_type: result.entity_type, entity_id: result.entity_id });
    }

    await db.from("n8n_sync_events").upsert(
      {
        event_type: payload.event_type,
        entity_type: result.entity_type === "task" ? null : result.entity_type,
        entity_id: result.entity_type === "task" ? null : result.entity_id,
        external_id: payload.external_id ?? dataOf(payload).external_id ?? null,
        payload: payload as unknown as Json,
        status: "processed",
        error_message: null,
        idempotency_key: idempotencyKey,
        processed_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key" },
    );
    await suppressEchoEvents(db, touched, startedAt);

    return {
      event_type: payload.event_type,
      entity_type: result.entity_type,
      entity_id: result.entity_id,
      external_id: payload.external_id ?? dataOf(payload).external_id ?? null,
      action: result.action,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida";

    await db.from("n8n_sync_events").upsert(
      {
        event_type: payload.event_type,
        entity_type: payload.entity_type ?? null,
        entity_id: payload.entity_id ?? null,
        external_id: payload.external_id ?? dataOf(payload).external_id ?? null,
        payload: payload as unknown as Json,
        status: "failed",
        error_message: message,
        idempotency_key: idempotencyKey,
        processed_at: new Date().toISOString(),
      },
      { onConflict: "idempotency_key" },
    );

    throw error;
  }
}
