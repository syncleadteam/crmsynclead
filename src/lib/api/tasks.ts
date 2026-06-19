import type { AuthContext } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";

export async function assertRelatedEntityExists(
  context: AuthContext,
  entityType: "lead" | "deal" | "contact" | "company",
  entityId: string,
) {
  const tableByType = {
    lead: "leads",
    deal: "deals",
    contact: "contacts",
    company: "companies",
  } as const;

  const { data, error } = await context.supabase
    .from(tableByType[entityType])
    .select("id")
    .eq("id", entityId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return apiError("bad_request", "Entidade relacionada invalida.", 400);
  }

  return null;
}

export function withOverdue<T extends { due_at: string; status: string }>(task: T) {
  return {
    ...task,
    is_overdue: task.status === "pending" && new Date(task.due_at) < new Date(),
  };
}
