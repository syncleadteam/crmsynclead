import { requireAuth } from "@/lib/api/auth";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { listLimit } from "@/lib/api/ownership";
import { createProposalSchema } from "@/lib/api/schemas";
import type { Database, Json } from "@/types/supabase";

type ProposalStatus = Database["public"]["Enums"]["proposal_status"];

const proposalStatuses: ProposalStatus[] = ["draft", "sent", "approved"];

function isProposalStatus(value: string): value is ProposalStatus {
  return proposalStatuses.includes(value as ProposalStatus);
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const dealId = searchParams.get("deal_id");

  let query = auth.context.supabase
    .from("proposals")
    .select("id,deal_id,version,status,title,content,total_value,pdf_url,approved_at,created_by,created_at,updated_at,deal:deals(id,title)")
    .order("created_at", { ascending: false })
    .limit(listLimit(request));

  if (status && isProposalStatus(status)) {
    query = query.eq("status", status);
  }

  if (dealId) {
    query = query.eq("deal_id", dealId);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar propostas.", 400, error.message);
  }

  return apiData(data);
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = createProposalSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { data: versions, error: versionError } = await auth.context.supabase
    .from("proposals")
    .select("version")
    .eq("deal_id", parsed.data.deal_id)
    .order("version", { ascending: false })
    .limit(1);

  if (versionError) {
    return apiError("bad_request", "Nao foi possivel calcular versao.", 400, versionError.message);
  }

  const nextVersion = (versions[0]?.version ?? 0) + 1;

  const { data, error } = await auth.context.supabase
    .from("proposals")
    .insert({
      deal_id: parsed.data.deal_id,
      version: nextVersion,
      title: parsed.data.title,
      content: parsed.data.content as Json,
      total_value: parsed.data.total_value,
      pdf_url: parsed.data.pdf_url ?? null,
      created_by: auth.context.profile.id,
    })
    .select("id,deal_id,version,status,title,content,total_value,pdf_url,approved_at,created_by,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel criar proposta.", 400, error.message);
  }

  return apiData(data, { status: 201 });
}
