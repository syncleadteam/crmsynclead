import { z } from "zod";

import { userRoles } from "@/lib/auth/roles";

export const userRoleSchema = z.enum(userRoles);

export const createUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  full_name: z.string().trim().min(1).max(160).nullable().optional(),
  role: userRoleSchema.default("seller"),
  is_active: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  id: z.uuid(),
  email: z.email().optional(),
  full_name: z.string().trim().min(1).max(160).nullable().optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional(),
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  manager_id: z.uuid().nullable().optional(),
  member_ids: z.array(z.uuid()).default([]),
});

export const updateTeamSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  manager_id: z.uuid().nullable().optional(),
  member_ids: z.array(z.uuid()).optional(),
});

export const leadStatusSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "disqualified",
  "converted",
]);

const nullableText = z.string().trim().min(1).max(255).nullable().optional();
const optionalOwnerId = z.uuid().optional();

export const createCompanySchema = z.object({
  name: z.string().trim().min(2).max(180),
  document_number: nullableText,
  segment: nullableText,
  owner_id: optionalOwnerId,
});

export const updateCompanySchema = createCompanySchema.partial().extend({
  id: z.uuid(),
});

export const createContactSchema = z.object({
  full_name: z.string().trim().min(2).max(180),
  email: z.email().nullable().optional(),
  phone: z.string().trim().min(6).max(40).nullable().optional(),
  company_id: z.uuid().nullable().optional(),
  owner_id: optionalOwnerId,
  source: nullableText,
});

export const updateContactSchema = createContactSchema.partial().extend({
  id: z.uuid(),
});

export const createLeadSchema = z
  .object({
    contact_id: z.uuid(),
    status: leadStatusSchema.default("new"),
    score: z.number().int().min(0).max(100).default(0),
    disqualification_reason: z.string().trim().min(1).max(500).nullable().optional(),
    owner_id: optionalOwnerId,
  })
  .refine(
    (value) =>
      value.status !== "disqualified" || Boolean(value.disqualification_reason),
    {
      message: "Motivo de desqualificacao obrigatorio.",
      path: ["disqualification_reason"],
    },
  );

export const updateLeadSchema = z
  .object({
    id: z.uuid(),
    status: leadStatusSchema.optional(),
    score: z.number().int().min(0).max(100).optional(),
    disqualification_reason: z.string().trim().min(1).max(500).nullable().optional(),
    owner_id: optionalOwnerId,
  })
  .refine(
    (value) =>
      value.status !== "disqualified" || Boolean(value.disqualification_reason),
    {
      message: "Motivo de desqualificacao obrigatorio.",
      path: ["disqualification_reason"],
    },
  );

export const createPipelineSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  is_active: z.boolean().default(true),
});

export const createPipelineStageSchema = z.object({
  name: z.string().trim().min(2).max(120),
  position: z.number().int().min(0),
  probability: z.number().int().min(0).max(100).default(0),
  is_won_stage: z.boolean().default(false),
  is_lost_stage: z.boolean().default(false),
});

export const dealStatusSchema = z.enum(["open", "won", "lost"]);

export const createDealSchema = z
  .object({
    title: z.string().trim().min(2).max(180),
    company_id: z.uuid().nullable().optional(),
    contact_id: z.uuid(),
    pipeline_id: z.uuid(),
    stage_id: z.uuid(),
    value: z.number().min(0).default(0),
    status: dealStatusSchema.default("open"),
    lost_reason: z.string().trim().min(1).max(500).nullable().optional(),
    owner_id: optionalOwnerId,
    expected_close_date: z.iso.date().nullable().optional(),
  })
  .refine((value) => value.status !== "lost" || Boolean(value.lost_reason), {
    message: "Motivo de perda obrigatorio.",
    path: ["lost_reason"],
  });

export const updateDealSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(2).max(180).optional(),
    company_id: z.uuid().nullable().optional(),
    contact_id: z.uuid().optional(),
    pipeline_id: z.uuid().optional(),
    stage_id: z.uuid().optional(),
    value: z.number().min(0).optional(),
    status: dealStatusSchema.optional(),
    lost_reason: z.string().trim().min(1).max(500).nullable().optional(),
    owner_id: optionalOwnerId,
    expected_close_date: z.iso.date().nullable().optional(),
  })
  .refine((value) => value.status !== "lost" || Boolean(value.lost_reason), {
    message: "Motivo de perda obrigatorio.",
    path: ["lost_reason"],
  });

export const moveDealStageSchema = z.object({
  stage_id: z.uuid(),
  status: dealStatusSchema.optional(),
  lost_reason: z.string().trim().min(1).max(500).nullable().optional(),
  value: z.number().min(0).optional(),
  expected_close_date: z.iso.date().nullable().optional(),
});

export const convertLeadSchema = z.object({
  title: z.string().trim().min(2).max(180),
  pipeline_id: z.uuid(),
  stage_id: z.uuid(),
  value: z.number().min(0).default(0),
  expected_close_date: z.iso.date().nullable().optional(),
});

export const listActivitiesSchema = z.object({
  entity_type: z.enum(["lead", "deal", "contact", "company"]).optional(),
  entity_id: z.uuid().optional(),
});

export const proposalStatusSchema = z.enum(["draft", "sent", "approved"]);

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(1000).nullable().optional(),
  sku: z.string().trim().min(1).max(80).nullable().optional(),
  unit_price: z.number().min(0).default(0),
  is_active: z.boolean().default(true),
  landing_form_code: z.string().trim().min(2).max(120).nullable().optional(),
  landing_form_category: z.enum(["agent", "module"]).nullable().optional(),
  landing_form_position: z.number().int().min(0).default(0),
  landing_form_required_agents: z.array(z.string().trim().min(1).max(120)).default([]),
});

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.uuid(),
});

export const createDealProductSchema = z.object({
  product_id: z.uuid(),
  quantity: z.number().positive().default(1),
  unit_price: z.number().min(0).optional(),
  discount_amount: z.number().min(0).default(0),
});

export const createProposalSchema = z.object({
  deal_id: z.uuid(),
  title: z.string().trim().min(2).max(180),
  content: z.record(z.string(), z.unknown()).default({}),
  total_value: z.number().min(0).default(0),
  pdf_url: z.url().nullable().optional(),
});

export const updateProposalSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(2).max(180).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  total_value: z.number().min(0).optional(),
  pdf_url: z.url().nullable().optional(),
  status: proposalStatusSchema.optional(),
});

export const taskTypeSchema = z.enum([
  "call",
  "meeting",
  "email",
  "follow_up",
  "other",
]);

export const taskStatusSchema = z.enum(["pending", "completed", "canceled"]);
export const relatedEntityTypeSchema = z.enum(["lead", "deal", "contact", "company"]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(2).max(180),
  type: taskTypeSchema.default("other"),
  related_entity_type: relatedEntityTypeSchema,
  related_entity_id: z.uuid(),
  due_at: z.iso.datetime(),
  status: taskStatusSchema.default("pending"),
  assigned_to: z.uuid().optional(),
  external_calendar_event_id: z.string().trim().min(1).max(255).nullable().optional(),
});

export const updateTaskSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(2).max(180).optional(),
  type: taskTypeSchema.optional(),
  related_entity_type: relatedEntityTypeSchema.optional(),
  related_entity_id: z.uuid().optional(),
  due_at: z.iso.datetime().optional(),
  status: taskStatusSchema.optional(),
  assigned_to: z.uuid().optional(),
  external_calendar_event_id: z.string().trim().min(1).max(255).nullable().optional(),
});

export const calendarSyncSchema = z.object({
  external_calendar_event_id: z.string().trim().min(1).max(255),
  provider: z.string().trim().min(1).max(80).default("calendar"),
  status: z.string().trim().min(1).max(80).default("synced"),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const googleCalendarDateTimeSchema = z.union([
  z.iso.datetime({ offset: true }),
  z.iso.date().transform((date) => `${date}T00:00:00.000Z`),
]);

export const googleCalendarEventSyncSchema = z.object({
  event_id: z.string().trim().min(1).max(255),
  calendar_id: z.string().trim().min(1).max(255).default("syncleadteam@gmail.com"),
  title: z.string().trim().min(1).max(180).default("Compromisso"),
  description: z.string().trim().max(2000).nullable().optional(),
  start: googleCalendarDateTimeSchema,
  end: googleCalendarDateTimeSchema.nullable().optional(),
  status: z.string().trim().min(1).max(80).default("confirmed"),
  html_link: z.url().nullable().optional(),
  assigned_to: z.uuid().optional(),
  related_entity_type: relatedEntityTypeSchema.nullable().optional(),
  related_entity_id: z.uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const googleCalendarEventsSyncSchema = z
  .object({
    provider: z.string().trim().min(1).max(80).default("google_calendar"),
    events: z.array(googleCalendarEventSyncSchema).min(1).max(100),
  })
  .or(googleCalendarEventSyncSchema.transform((event) => ({
    provider: "google_calendar",
    events: [event],
  })));

export const leadScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  provider: z.string().trim().min(1).max(80).default("n8n"),
  status: z.string().trim().min(1).max(80).default("scored"),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const createExternalActivitySchema = z.object({
  entity_type: relatedEntityTypeSchema,
  entity_id: z.uuid(),
  action: z.string().trim().min(2).max(120),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
