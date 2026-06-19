import type { SupabaseClient, User } from "@supabase/supabase-js";

import { userRoles, type UserRole } from "@/lib/auth/roles";
import { apiError } from "@/lib/api/errors";
import { createSupabaseUserClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/types/supabase";

type UserProfile = Tables<"users">;

export type AuthContext = {
  accessToken: string;
  authUser: User;
  profile: UserProfile;
  supabase: SupabaseClient<Database>;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

export async function requireAuth(request: Request): Promise<
  | { ok: true; context: AuthContext }
  | { ok: false; response: Response }
> {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return {
      ok: false,
      response: apiError("unauthorized", "Token de acesso ausente.", 401),
    };
  }

  let supabase: SupabaseClient<Database>;

  try {
    supabase = createSupabaseUserClient(accessToken);
  } catch {
    return {
      ok: false,
      response: apiError("internal_error", "Supabase nao configurado.", 500),
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return {
      ok: false,
      response: apiError("unauthorized", "Token de acesso invalido.", 401),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    return {
      ok: false,
      response: apiError("forbidden", "Usuario sem perfil ativo no CRM.", 403),
    };
  }

  return {
    ok: true,
    context: {
      accessToken,
      authUser: user,
      profile,
      supabase,
    },
  };
}

export async function requireRole(
  request: Request,
  allowedRoles: readonly UserRole[],
) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth;
  }

  const role = auth.context.profile.role;

  if (!userRoles.includes(role) || !allowedRoles.includes(role)) {
    return {
      ok: false as const,
      response: apiError("forbidden", "Acao nao permitida para este papel.", 403),
    };
  }

  return auth;
}
