import { createActivity } from "@/lib/api/deals";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { flushIntegrationEvents } from "@/lib/api/integration-dispatch";
import { requirePermission } from "@/lib/api/permissions";
import { listLimit, resolveOwnerId } from "@/lib/api/ownership";
import { createTaskSchema } from "@/lib/api/schemas";
import { assertRelatedEntityExists, withOverdue } from "@/lib/api/tasks";
import type { Database } from "@/types/supabase";

type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskType = Database["public"]["Enums"]["task_type"];
type RelatedEntityType = Database["public"]["Enums"]["activity_entity_type"];

const taskStatuses: TaskStatus[] = ["pending", "completed", "canceled"];
const taskTypes: TaskType[] = ["call", "meeting", "email", "follow_up", "other"];
const relatedEntityTypes: RelatedEntityType[] = ["lead", "deal", "contact", "company"];
const taskSelect =
  "id,title,type,related_entity_type,related_entity_id,due_at,starts_at,ends_at,status,assigned_to,external_calendar_event_id,google_calendar_id,google_calendar_html_link,google_calendar_event_status,completed_at,canceled_at,created_at,updated_at,assignee:users!tasks_assigned_to_fkey(id,email,full_name,role)";

function isTaskStatus(value: string): value is TaskStatus {
  return taskStatuses.includes(value as TaskStatus);
}

function isTaskType(value: string): value is TaskType {
  return taskTypes.includes(value as TaskType);
}

function isRelatedEntityType(value: string): value is RelatedEntityType {
  return relatedEntityTypes.includes(value as RelatedEntityType);
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "tasks", "view");

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const relatedEntityType = searchParams.get("related_entity_type");
  const relatedEntityId = searchParams.get("related_entity_id");

  let query = auth.context.supabase
    .from("tasks")
    .select(taskSelect)
    .order("due_at", { ascending: true })
    .limit(listLimit(request));

  if (status && isTaskStatus(status)) {
    query = query.eq("status", status);
  }

  if (type && isTaskType(type)) {
    query = query.eq("type", type);
  }

  if (relatedEntityType && isRelatedEntityType(relatedEntityType)) {
    query = query.eq("related_entity_type", relatedEntityType);
  }

  if (relatedEntityId) {
    query = query.eq("related_entity_id", relatedEntityId);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar tarefas.", 400, error.message);
  }

  return apiData((data ?? []).map(withOverdue));
}

export async function POST(request: Request) {
  const auth = await requirePermission(request, "tasks", "create");

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = createTaskSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const relatedError = await assertRelatedEntityExists(
    auth.context,
    parsed.data.related_entity_type,
    parsed.data.related_entity_id,
  );

  if (relatedError) {
    return relatedError;
  }

  const status = parsed.data.status;
  const { data, error } = await auth.context.supabase
    .from("tasks")
    .insert({
      title: parsed.data.title,
      type: parsed.data.type,
      related_entity_type: parsed.data.related_entity_type,
      related_entity_id: parsed.data.related_entity_id,
      due_at: parsed.data.due_at,
      status,
      assigned_to: resolveOwnerId(auth.context, parsed.data.assigned_to),
      external_calendar_event_id: parsed.data.external_calendar_event_id ?? null,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      canceled_at: status === "canceled" ? new Date().toISOString() : null,
    })
    .select(taskSelect)
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel criar tarefa.", 400, error.message);
  }

  if (status === "completed") {
    await createActivity(auth.context, {
      entity_type: parsed.data.related_entity_type,
      entity_id: parsed.data.related_entity_id,
      action: "task_completed",
      metadata: { task_id: data.id },
    });
  }

  await flushIntegrationEvents();

  return apiData(withOverdue(data), { status: 201 });
}
