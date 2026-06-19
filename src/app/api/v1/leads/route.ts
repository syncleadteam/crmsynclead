import { requireAuth } from "@/lib/api/auth";
import { apiData, apiError, validationError } from "@/lib/api/errors";
import { listLimit, resolveOwnerId } from "@/lib/api/ownership";
import { createLeadSchema } from "@/lib/api/schemas";
import type { Database } from "@/types/supabase";

type LeadStatus = Database["public"]["Enums"]["lead_status"];

const leadStatuses: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "disqualified",
  "converted",
];

function isLeadStatus(value: string): value is LeadStatus {
  return leadStatuses.includes(value as LeadStatus);
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = auth.context.supabase
    .from("leads")
    .select("id,contact_id,status,score,disqualification_reason,owner_id,converted_deal_id,created_at,updated_at,contact:contacts(id,full_name,email,phone,company:companies(id,name)),owner:users!leads_owner_id_fkey(id,email,full_name,role)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(listLimit(request));

  if (status && isLeadStatus(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return apiError("bad_request", "Nao foi possivel listar leads.", 400, error.message);
  }

  return apiData(data);
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = createLeadSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { data, error } = await auth.context.supabase
    .from("leads")
    .insert({
      contact_id: parsed.data.contact_id,
      status: parsed.data.status,
      score: parsed.data.score,
      disqualification_reason: parsed.data.disqualification_reason ?? null,
      owner_id: resolveOwnerId(auth.context, parsed.data.owner_id),
    })
    .select("id,contact_id,status,score,disqualification_reason,owner_id,converted_deal_id,created_at,updated_at")
    .single();

  if (error) {
    return apiError("bad_request", "Nao foi possivel criar lead.", 400, error.message);
  }

  return apiData(data, { status: 201 });
}
