import { requireAuth } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import {
  hasPermission,
  type PermissionAction,
  type PermissionModule,
} from "@/lib/auth/permissions";

export async function requirePermission(
  request: Request,
  module: PermissionModule,
  action: PermissionAction,
) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth;
  }

  if (!hasPermission(auth.context.profile.role, module, action)) {
    return {
      ok: false as const,
      response: apiError(
        "forbidden",
        "Seu papel nao permite esta acao neste modulo.",
        403,
      ),
    };
  }

  return auth;
}

