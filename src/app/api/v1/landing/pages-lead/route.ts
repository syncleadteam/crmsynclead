import { z } from "zod";

import { apiData, apiError, validationError } from "@/lib/api/errors";
import { flushIntegrationEvents } from "@/lib/api/integration-dispatch";
import { rateLimit, requestIp } from "@/lib/api/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const pagesLeadSchema = z.object({
  client: z.object({
    client_name: z.string().trim().min(2).max(100),
    company_name: z.string().trim().min(2).max(150),
    phone: z.string().trim().min(10).max(20),
    email: z.string().trim().email().max(255),
    business_sector: z.string().trim().min(2).max(150),
  }),
  project_type: z.string().trim().min(2).max(120),
  objectives: z.array(z.string().trim().min(2).max(120)).min(1).max(12),
  observations: z.string().trim().max(2000).optional().default(""),
  source_url: z.string().trim().url().optional(),
});

function landingError(
  code: Parameters<typeof apiError>[0],
  message: string,
  status: number,
  details?: unknown,
) {
  const response = apiError(code, message, status, details);

  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

async function readPayload(request: Request) {
  const text = await request.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text) as unknown;
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  const limited = rateLimit(`landing:pages-lead:${requestIp(request)}`, {
    limit: 12,
    windowMs: 60_000,
  });

  if (limited) {
    for (const [key, value] of Object.entries(corsHeaders)) {
      limited.headers.set(key, value);
    }

    return limited;
  }

  let payload: unknown;

  try {
    payload = await readPayload(request);
  } catch {
    return landingError("bad_request", "Payload invalido.", 400);
  }

  const parsed = pagesLeadSchema.safeParse(payload);

  if (!parsed.success) {
    const response = validationError(parsed.error);

    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }

    return response;
  }

  const supabase = createSupabaseServiceClient();
  const client = parsed.data.client;

  const { data: owners, error: ownerError } = await supabase
    .from("users")
    .select("id,role,created_at")
    .eq("is_active", true)
    .in("role", ["admin", "manager", "seller"])
    .order("created_at", { ascending: true })
    .limit(20);

  if (ownerError) {
    return landingError(
      "bad_request",
      "Nao foi possivel selecionar responsavel pelo lead.",
      400,
      ownerError.message,
    );
  }

  const rolePriority = { admin: 1, manager: 2, seller: 3 } as const;
  const owner = owners?.sort(
    (a, b) =>
      rolePriority[a.role as keyof typeof rolePriority] -
        rolePriority[b.role as keyof typeof rolePriority] ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];

  if (!owner) {
    return landingError("bad_request", "Nenhum usuario ativo disponivel para receber leads.", 400);
  }

  const email = client.email.toLowerCase();

  const { data: existingCompany, error: companyLookupError } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", owner.id)
    .is("deleted_at", null)
    .ilike("name", client.company_name)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (companyLookupError) {
    return landingError(
      "bad_request",
      "Nao foi possivel consultar empresa.",
      400,
      companyLookupError.message,
    );
  }

  let companyId = existingCompany?.id;

  if (!companyId) {
    const { data: company, error: insertCompanyError } = await supabase
      .from("companies")
      .insert({
        name: client.company_name,
        segment: client.business_sector,
        owner_id: owner.id,
      })
      .select("id")
      .single();

    if (insertCompanyError) {
      return landingError(
        "bad_request",
        "Nao foi possivel criar empresa.",
        400,
        insertCompanyError.message,
      );
    }

    companyId = company.id;
  } else {
    await supabase
      .from("companies")
      .update({ segment: client.business_sector })
      .eq("id", companyId);
  }

  const { data: existingContact, error: contactLookupError } = await supabase
    .from("contacts")
    .select("id")
    .eq("owner_id", owner.id)
    .is("deleted_at", null)
    .ilike("email", email)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (contactLookupError) {
    return landingError(
      "bad_request",
      "Nao foi possivel consultar contato.",
      400,
      contactLookupError.message,
    );
  }

  let contactId = existingContact?.id;

  if (!contactId) {
    const { data: contact, error: insertContactError } = await supabase
      .from("contacts")
      .insert({
        full_name: client.client_name,
        email,
        phone: client.phone,
        company_id: companyId,
        owner_id: owner.id,
        source: "landing_pages",
      })
      .select("id")
      .single();

    if (insertContactError) {
      return landingError(
        "bad_request",
        "Nao foi possivel criar contato.",
        400,
        insertContactError.message,
      );
    }

    contactId = contact.id;
  } else {
    await supabase
      .from("contacts")
      .update({
        full_name: client.client_name,
        phone: client.phone,
        company_id: companyId,
        source: "landing_pages",
      })
      .eq("id", contactId);
  }

  const score = Math.min(100, 35 + parsed.data.objectives.length * 7);

  const { data: lead, error: insertLeadError } = await supabase
    .from("leads")
    .insert({
      contact_id: contactId,
      status: "new",
      score,
      owner_id: owner.id,
    })
    .select("id")
    .single();

  if (insertLeadError) {
    return landingError(
      "bad_request",
      "Nao foi possivel criar lead.",
      400,
      insertLeadError.message,
    );
  }

  const metadata = {
    source: "landing_pages",
    form: "pages_briefing",
    source_url: parsed.data.source_url ?? null,
    client,
    project_type: parsed.data.project_type,
    objectives: parsed.data.objectives,
    observations: parsed.data.observations || null,
  } satisfies Json;

  const { data: activity, error: insertActivityError } = await supabase
    .from("activities")
    .insert({
      entity_type: "lead",
      entity_id: lead.id,
      actor_type: "system",
      actor_id: null,
      action: "landing_pages_form_submitted",
      metadata,
    })
    .select("id")
    .single();

  if (insertActivityError) {
    return landingError(
      "bad_request",
      "Nao foi possivel registrar atividade.",
      400,
      insertActivityError.message,
    );
  }

  await flushIntegrationEvents();

  return apiData(
    {
      leadId: lead.id,
      companyId,
      contactId,
      activityId: activity.id,
      ownerId: owner.id,
    },
    { status: 201, headers: corsHeaders },
  );
}
