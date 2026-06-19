import type { AuthContext } from "@/lib/api/auth";
import type { Json } from "@/types/supabase";

export async function writeAuditLog(
  context: AuthContext,
  input: {
    action: string;
    target_table: string;
    target_id: string;
    before?: unknown;
    after?: unknown;
  },
) {
  return context.supabase.from("audit_logs").insert({
    actor_id: context.profile.id,
    action: input.action,
    target_table: input.target_table,
    target_id: input.target_id,
    before: (input.before ?? null) as Json,
    after: (input.after ?? null) as Json,
  });
}
