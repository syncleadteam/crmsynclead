import { requireAuth } from "@/lib/api/auth";
import { writeAuditLog } from "@/lib/api/audit";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { updateProposalSchema } from "@/lib/api/schemas";
import type { Json } from "@/types/supabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const { data, error } = await auth.context.supabase
    .from("proposals")
    .select("id,deal_id,version,status,title,content,total_value,pdf_url,approved_at,created_by,created_at,updated_at,deal:deals(id,title)")
    .eq("id", id)
    .single();

  if (error) {
    return apiError("not_found", "Proposta nao encontrada.", 404);
  }

  return apiData(data);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const parsed = updateProposalSchema.safeParse({
    ...(await request.json().catch(() => null)),
    id,
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { data: current, error: currentError } = await auth.context.supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();

  if (currentError || !current) {
    return apiError("not_found", "Proposta nao encontrada.", 404);
  }

  const changes: Partial<typeof parsed.data> = { ...parsed.data };
  delete changes.id;

  if (current.status === "approved") {
    const { data: versions } = await auth.context.supabase
      .from("proposals")
      .select("version")
      .eq("deal_id", current.deal_id)
      .order("version", { ascending: false })
      .limit(1);

    const { data: nextProposal, error: nextError } = await auth.context.supabase
      .from("proposals")
      .insert({
        deal_id: current.deal_id,
        version: ((versions?.[0]?.version ?? current.version) + 1),
        title: changes.title ?? current.title,
        content: (changes.content ?? current.content) as Json,
        total_value: changes.total_value ?? current.total_value,
        pdf_url: changes.pdf_url ?? current.pdf_url,
        created_by: auth.context.profile.id,
      })
      .select("id,deal_id,version,status,title,content,total_value,pdf_url,approved_at,created_by,created_at,updated_at")
      .single();

    if (nextError) {
      return apiError("bad_request", "Nao foi possivel criar nova versao.", 400, nextError.message);
    }

    await writeAuditLog(auth.context, {
      action: "edit_approved_proposal_new_version",
      target_table: "proposals",
      target_id: current.id,
      before: current,
      after: nextProposal,
    });

    return apiData(nextProposal, { status: 201 });
  }

  const { data, error } = await auth.context.supabase
    .from("proposals")
    .update({
      ...changes,
      content: changes.content as Json | undefined,
    })
    .eq("id", id)
    .select("id,deal_id,version,status,title,content,total_value,pdf_url,approved_at,created_by,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel atualizar proposta.", 400, error.message);
  }

  return apiData(data);
}
