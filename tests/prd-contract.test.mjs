import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const migrationFiles = [
  "supabase/migrations/20260617063826_phase_1_rbac_users_teams.sql",
  "supabase/migrations/20260617065345_phase_2_core_crm_entities.sql",
  "supabase/migrations/20260617071358_phase_3_deals_pipeline_activities.sql",
  "supabase/migrations/20260617072611_phase_4_products_proposals_audit.sql",
  "supabase/migrations/20260617073432_phase_5_tasks_agenda.sql",
  "supabase/migrations/20260617074946_phase_7_integrations_state.sql",
];

function read(path) {
  return readFileSync(path, "utf8");
}

test("required CRM tables are created by migrations", () => {
  const sql = migrationFiles.map(read).join("\n");

  for (const table of [
    "users",
    "teams",
    "team_members",
    "companies",
    "contacts",
    "leads",
    "pipelines",
    "pipeline_stages",
    "deals",
    "activities",
    "products",
    "deal_products",
    "proposals",
    "audit_logs",
    "tasks",
    "integrations_state",
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE public\\.${table}\\b`));
  }
});

test("business tables enable row level security", () => {
  const sql = migrationFiles.map(read).join("\n");

  for (const table of [
    "users",
    "companies",
    "contacts",
    "leads",
    "deals",
    "activities",
    "proposals",
    "tasks",
    "integrations_state",
  ]) {
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
  }
});

test("environment example does not contain concrete secrets", () => {
  const env = read(".env.example");

  assert.match(env, /NEXT_PUBLIC_SUPABASE_URL=/);
  assert.match(env, /SUPABASE_SERVICE_ROLE_KEY=/);
  assert.match(env, /N8N_CRM_WEBHOOK_URL=/);
  assert.match(env, /CRM_N8N_WEBHOOK_SECRET=/);
  assert.match(env, /INTEGRATION_DISPATCH_TOKEN=/);
  assert.doesNotMatch(env, /eyJ[a-zA-Z0-9_-]+\./);
});

test("bidirectional n8n integration contract is present", () => {
  const migration = read("supabase/migrations/20260628211000_bidirectional_n8n_integration.sql");
  const realtime = read("supabase/migrations/20260628213000_integration_realtime.sql");
  const hardening = read("supabase/migrations/20260628214500_harden_integration_security.sql");
  const dispatcher = read("src/app/api/v1/integrations/events/dispatch/route.ts");
  const sync = read("src/app/api/v1/integrations/n8n/sync/route.ts");
  const docs = read("docs/architecture/n8n-crm-bidirectional-sync.md");

  for (const table of [
    "integration_events",
    "integration_event_deliveries",
    "n8n_sync_events",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\b`));
  }

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.enqueue_integration_event/);
  assert.match(migration, /contacts_integration_events/);
  assert.match(migration, /deals_integration_events/);
  assert.match(migration, /tasks_integration_events/);
  assert.match(realtime, /ALTER PUBLICATION supabase_realtime ADD TABLE/);
  assert.match(hardening, /REVOKE EXECUTE ON FUNCTION public\.enqueue_integration_event/);
  assert.match(hardening, /FROM PUBLIC/);
  assert.match(hardening, /integration_events_responsible_user_id_idx/);
  assert.match(dispatcher, /dispatchIntegrationEvents/);
  assert.match(sync, /processN8nSyncEvent/);
  assert.match(docs, /CRM para N8N/);
  assert.match(docs, /N8N para CRM/);
});
