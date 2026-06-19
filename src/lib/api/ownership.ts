import type { AuthContext } from "@/lib/api/auth";

export function resolveOwnerId(
  context: AuthContext,
  requestedOwnerId?: string | null,
) {
  if (context.profile.role === "admin" || context.profile.role === "manager") {
    return requestedOwnerId ?? context.profile.id;
  }

  return context.profile.id;
}

export function listLimit(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 100);

  return Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 100;
}
