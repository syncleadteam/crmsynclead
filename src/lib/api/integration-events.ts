import { createHmac, timingSafeEqual } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/supabase";

type ServiceClient = SupabaseClient<Database>;
type QueryResult<T = unknown> = {
  data: T | null;
  error: { message: string } | null;
};
type LooseQuery<T = unknown> = PromiseLike<QueryResult<T>> & {
  select(columns: string): LooseQuery<T>;
  in(column: string, values: string[]): LooseQuery<T>;
  lte(column: string, value: string): LooseQuery<T>;
  order(column: string, options: { ascending: boolean }): LooseQuery<T>;
  limit(value: number): LooseQuery<T>;
  update(values: Record<string, unknown>): LooseQuery<T>;
  insert(values: Record<string, unknown>): LooseQuery<T>;
  eq(column: string, value: string): LooseQuery<T>;
};
type LooseSupabase = {
  from(table: string): LooseQuery;
};

export type IntegrationEvent = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  responsible_user_id: string | null;
  payload: Json;
  status: "pending" | "processing" | "delivered" | "failed" | "dead";
  attempts: number;
  max_attempts: number;
  idempotency_key: string;
  created_at: string;
};

export type DispatchResult = {
  processed: number;
  delivered: number;
  failed: number;
  dead: number;
};

function integrationWebhookUrl() {
  return (
    process.env.N8N_CRM_WEBHOOK_URL?.replace(/\/+$/, "") ??
    "https://n8n.syncleadteam.com/webhook/crm-events"
  );
}

function signingSecret() {
  return process.env.CRM_N8N_WEBHOOK_SECRET ?? process.env.N8N_CALLBACK_TOKEN ?? "";
}

export function signIntegrationPayload(payload: string, timestamp: string) {
  const secret = signingSecret();

  if (!secret) {
    return "";
  }

  return createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
}

export function verifyIntegrationSignature(payload: string, timestamp: string | null, signature: string | null) {
  const expected = timestamp ? signIntegrationPayload(payload, timestamp) : "";

  if (!expected || !signature) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function isDispatchAuthorized(request: Request) {
  const expected = process.env.INTEGRATION_DISPATCH_TOKEN ?? process.env.CRON_SECRET;

  if (!expected) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : null;

  return token === expected;
}

async function claimEvents(supabase: ServiceClient, limit: number) {
  const db = supabase as unknown as LooseSupabase;
  const { data, error } = await db
    .from("integration_events")
    .select("*")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const events = (data ?? []) as IntegrationEvent[];

  if (events.length === 0) {
    return [];
  }

  const ids = events.map((event) => event.id);
  const { error: updateError } = await db
    .from("integration_events")
    .update({ status: "processing", locked_at: new Date().toISOString() })
    .in("id", ids);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return events;
}

async function recordDelivery(
  supabase: ServiceClient,
  event: IntegrationEvent,
  input: { statusCode?: number; responseBody?: string; errorMessage?: string; durationMs: number },
) {
  const db = supabase as unknown as LooseSupabase;

  await db.from("integration_event_deliveries").insert({
    event_id: event.id,
    attempt: event.attempts + 1,
    status_code: input.statusCode ?? null,
    response_body: input.responseBody?.slice(0, 4000) ?? null,
    error_message: input.errorMessage?.slice(0, 2000) ?? null,
    duration_ms: input.durationMs,
  });
}

async function markEvent(
  supabase: ServiceClient,
  event: IntegrationEvent,
  input: { delivered: boolean; errorMessage?: string },
) {
  const attempts = event.attempts + 1;
  const isDead = !input.delivered && attempts >= event.max_attempts;
  const retryDelaySeconds = Math.min(60 * 2 ** Math.max(attempts - 1, 0), 3600);
  const nextAttemptAt = new Date(Date.now() + retryDelaySeconds * 1000).toISOString();
  const db = supabase as unknown as LooseSupabase;

  await db
    .from("integration_events")
    .update({
      status: input.delivered ? "delivered" : isDead ? "dead" : "failed",
      attempts,
      delivered_at: input.delivered ? new Date().toISOString() : null,
      locked_at: null,
      next_attempt_at: input.delivered ? new Date().toISOString() : nextAttemptAt,
      last_error: input.errorMessage ?? null,
    })
    .eq("id", event.id);
}

export async function dispatchIntegrationEvents(supabase: ServiceClient, limit = 10): Promise<DispatchResult> {
  const events = await claimEvents(supabase, limit);
  const result: DispatchResult = { processed: events.length, delivered: 0, failed: 0, dead: 0 };
  const url = integrationWebhookUrl();

  for (const event of events) {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({
      id: event.id,
      event_type: event.event_type,
      timestamp,
      responsible_user_id: event.responsible_user_id,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      data: event.payload,
      idempotency_key: event.idempotency_key,
    });
    const signature = signIntegrationPayload(body, timestamp);

    try {
      const response = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: {
          "Content-Type": "application/json",
          "X-SyncLead-Event-Id": event.id,
          "X-SyncLead-Event-Type": event.event_type,
          "X-SyncLead-Signature": signature,
          "X-SyncLead-Timestamp": timestamp,
        },
        body,
      });
      const text = await response.text();
      const durationMs = Date.now() - startedAt;

      await recordDelivery(supabase, event, {
        statusCode: response.status,
        responseBody: text,
        errorMessage: response.ok ? undefined : text || `HTTP ${response.status}`,
        durationMs,
      });
      await markEvent(supabase, event, {
        delivered: response.ok,
        errorMessage: response.ok ? undefined : text || `HTTP ${response.status}`,
      });

      if (response.ok) {
        result.delivered += 1;
      } else if (event.attempts + 1 >= event.max_attempts) {
        result.dead += 1;
      } else {
        result.failed += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida";
      await recordDelivery(supabase, event, {
        errorMessage: message,
        durationMs: Date.now() - startedAt,
      });
      await markEvent(supabase, event, { delivered: false, errorMessage: message });

      if (event.attempts + 1 >= event.max_attempts) {
        result.dead += 1;
      } else {
        result.failed += 1;
      }
    }
  }

  return result;
}
