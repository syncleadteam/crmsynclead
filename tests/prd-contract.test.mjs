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
  assert.doesNotMatch(env, /eyJ[a-zA-Z0-9_-]+\./);
});
