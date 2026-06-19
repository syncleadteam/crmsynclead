import { requireRole } from "@/lib/api/auth";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { createTeamSchema, updateTeamSchema } from "@/lib/api/schemas";

export async function GET(request: Request) {
  const auth = await requireRole(request, ["admin", "manager"]);

  if (!auth.ok) {
    return auth.response;
  }

  const { data, error } = await auth.context.supabase
    .from("teams")
    .select(
      "id,name,description,manager_id,created_at,updated_at,manager:users!teams_manager_id_fkey(id,email,full_name,role),team_members(id,user_id,user:users!team_members_user_id_fkey(id,email,full_name,role,is_active))",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar equipes.", 400, error.message);
  }

  return apiData(data);
}

export async function POST(request: Request) {
  const auth = await requireRole(request, ["admin", "manager"]);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = createTeamSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const managerId =
    auth.context.profile.role === "manager"
      ? auth.context.profile.id
      : (parsed.data.manager_id ?? null);

  const { data: team, error: teamError } = await auth.context.supabase
    .from("teams")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      manager_id: managerId,
    })
    .select("id,name,description,manager_id,created_at,updated_at")
    .single();

  if (teamError) {
    return apiError("bad_request", "Nao foi possivel criar equipe.", 400, teamError.message);
  }

  if (parsed.data.member_ids.length > 0) {
    const { error: membersError } = await auth.context.supabase
      .from("team_members")
      .insert(
        parsed.data.member_ids.map((userId) => ({
          team_id: team.id,
          user_id: userId,
        })),
      );

    if (membersError) {
      return apiError("bad_request", "Equipe criada, mas membros nao foram vinculados.", 400, membersError.message);
    }
  }

  return apiData(team, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireRole(request, ["admin", "manager"]);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = updateTeamSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { id, member_ids: memberIds, ...changes } = parsed.data;

  const { data: team, error: teamError } = await auth.context.supabase
    .from("teams")
    .update({
      ...changes,
      manager_id:
        auth.context.profile.role === "manager"
          ? auth.context.profile.id
          : changes.manager_id,
    })
    .eq("id", id)
    .select("id,name,description,manager_id,created_at,updated_at")
    .single();

  if (teamError) {
    return apiError("bad_request", "Nao foi possivel atualizar equipe.", 400, teamError.message);
  }

  if (memberIds) {
    const { error: deleteError } = await auth.context.supabase
      .from("team_members")
      .delete()
      .eq("team_id", id);

    if (deleteError) {
      return apiError("bad_request", "Nao foi possivel atualizar membros.", 400, deleteError.message);
    }

    if (memberIds.length > 0) {
      const { error: insertError } = await auth.context.supabase
        .from("team_members")
        .insert(memberIds.map((userId) => ({ team_id: id, user_id: userId })));

      if (insertError) {
        return apiError("bad_request", "Nao foi possivel vincular membros.", 400, insertError.message);
      }
    }
  }

  return apiData(team);
}
