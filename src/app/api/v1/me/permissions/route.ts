import { requireAuth } from "@/lib/api/auth";
import { apiData } from "@/lib/api/errors";
import { rolePermissions } from "@/lib/auth/permissions";

export async function GET(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  return apiData({
    user: {
      id: auth.context.profile.id,
      email: auth.context.profile.email,
      full_name: auth.context.profile.full_name,
      role: auth.context.profile.role,
    },
    permissions: rolePermissions[auth.context.profile.role],
  });
}

