import { createActivity } from "@/lib/api/deals";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { flushIntegrationEvents } from "@/lib/api/integration-dispatch";
import { requirePermission } from "@/lib/api/permissions";
import { resolveOwnerId } from "@/lib/api/ownership";
import { updateTaskSchema } from "@/lib/api/schemas";
import { assertRelatedEntityExists, withOverdue } from "@/lib/api/tasks";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const taskSelect =
  "id,title,type,related_entity_type,related_entity_id,due_at,starts_at,ends_at,status,assigned_to,external_calendar_event_id,google_calendar_id,google_calendar_html_link,google_calendar_event_status,completed_at,canceled_at,created_at,updated_at,assignee:users!tasks_assigned_to_fkey(id,email,full_name,role)";

export async function GET(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "tasks", "view");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const { data, error } = await auth.context.supabase
    .from("tasks")
    .select(taskSelect)
    .eq("id", id)
    .single();

  if (error) {
    return apiError("not_found", "Tarefa nao encontrada.", 404);
  }

  return apiData(withOverdue(data));
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "tasks", "update");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const parsed = updateTaskSchema.safeParse({
    ...(await request.json().catch(() => null)),
    id,
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { data: current, error: currentError } = await auth.context.supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (currentError || !current) {
    return apiError("not_found", "Tarefa nao encontrada.", 404);
  }

  const nextEntityType =
    parsed.data.related_entity_type ?? current.related_entity_type;
  const nextEntityId = parsed.data.related_entity_id ?? current.related_entity_id;
  const relatedError = await assertRelatedEntityExists(
    auth.context,
    nextEntityType,
    nextEntityId,
  );

  if (relatedError) {
    return relatedError;
  }

  const changes: Partial<typeof parsed.data> = { ...parsed.data };
  const assignedTo = changes.assigned_to;
  delete changes.id;
  delete changes.assigned_to;

  const nextStatus = changes.status ?? current.status;
  const completedAt =
    nextStatus === "completed" && current.status !== "completed"
      ? new Date().toISOString()
      : current.completed_at;
  const canceledAt =
    nextStatus === "canceled" && current.status !== "canceled"
      ? new Date().toISOString()
      : current.canceled_at;

  const { data, error } = await auth.context.supabase
    .from("tasks")
    .update({
      ...changes,
      assigned_to: assignedTo ? resolveOwnerId(auth.context, assignedTo) : undefined,
      completed_at: nextStatus === "completed" ? completedAt : null,
      canceled_at: nextStatus === "canceled" ? canceledAt : null,
    })
    .eq("id", id)
    .select(taskSelect)
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel atualizar tarefa.", 400, error.message);
  }

  if (
    nextStatus === "completed" &&
    current.status !== "completed" &&
    data.related_entity_type &&
    data.related_entity_id
  ) {
    await createActivity(auth.context, {
      entity_type: data.related_entity_type,
      entity_id: data.related_entity_id,
      action: "task_completed",
      metadata: { task_id: data.id },
    });
  }

  await flushIntegrationEvents();

  return apiData(withOverdue(data));
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requirePermission(request, "tasks", "delete");

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const { data, error } = await auth.context.supabase
    .from("tasks")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(taskSelect)
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel cancelar tarefa.", 400, error.message);
  }

  await flushIntegrationEvents();

  return apiData(withOverdue(data));
}
