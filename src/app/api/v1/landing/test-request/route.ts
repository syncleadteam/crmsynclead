import { apiData, apiError } from "@/lib/api/errors";
import { EvolutionService, evolutionConfigError } from "@/lib/api/evolution";
import { rateLimit, requestIp } from "@/lib/api/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type LandingTestRequest = {
  leadId?: string;
};

type LandingLead = {
  id: string;
  owner_id: string;
  converted_deal_id: string | null;
  created_at: string;
  contact: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    source: string | null;
    company: {
      id: string;
      name: string;
      segment: string | null;
    } | null;
  } | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

function normalizePhone(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";

  if (!digits) {
    return null;
  }

  return digits.startsWith("55") ? digits : `55${digits}`;
}

async function readPayload(request: Request): Promise<LandingTestRequest> {
  const text = await request.text();

  if (!text) {
    return {};
  }

  return JSON.parse(text) as LandingTestRequest;
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  const limited = rateLimit(`landing:test-request:${requestIp(request)}`, {
    limit: 20,
    windowMs: 60_000,
  });

  if (limited) {
    for (const [key, value] of Object.entries(corsHeaders)) {
      limited.headers.set(key, value);
    }

    return limited;
  }

  let payload: LandingTestRequest;

  try {
    payload = await readPayload(request);
  } catch {
    return landingError("bad_request", "Payload invalido.", 400);
  }

  if (!payload.leadId) {
    return landingError("bad_request", "leadId e obrigatorio.", 400);
  }

  const supabase = createSupabaseServiceClient();

  const { data: leadData, error: leadError } = await supabase
    .from("leads")
    .select(
      "id,owner_id,converted_deal_id,created_at,contact:contacts(id,full_name,email,phone,source,company:companies(id,name,segment))",
    )
    .eq("id", payload.leadId)
    .single();

  if (leadError || !leadData) {
    return landingError("not_found", "Lead nao encontrado.", 404, leadError?.message);
  }

  const lead = leadData as unknown as LandingLead;

  if (lead.contact?.source !== "landing_page") {
    return landingError("forbidden", "Lead nao pertence a landing.", 403);
  }

  const createdAt = new Date(lead.created_at).getTime();
  const maxAgeMs = 24 * 60 * 60 * 1000;

  if (!Number.isFinite(createdAt) || Date.now() - createdAt > maxAgeMs) {
    return landingError("bad_request", "Solicitacao expirada para envio automatico.", 400);
  }

  const { data: existingActivity, error: activityLookupError } = await supabase
    .from("activities")
    .select("id")
    .eq("entity_type", "lead")
    .eq("entity_id", lead.id)
    .eq("action", "landing_test_request_confirmation_sent")
    .maybeSingle();

  if (activityLookupError) {
    return landingError(
      "bad_request",
      "Nao foi possivel verificar atividade existente.",
      400,
      activityLookupError.message,
    );
  }

  if (existingActivity) {
    return apiData(
      {
        ok: true,
        already_sent: true,
        activity_id: existingActivity.id,
      },
      { headers: corsHeaders },
    );
  }

  const phone = normalizePhone(lead.contact?.phone);

  if (!phone) {
    return landingError("bad_request", "Lead sem telefone valido.", 400);
  }

  const { data: connection, error: connectionError } = await supabase
    .from("user_whatsapp_connections")
    .select("id,instance_name,phone_number,status")
    .eq("user_id", lead.owner_id)
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (connectionError) {
    return landingError(
      "bad_request",
      "Nao foi possivel consultar WhatsApp conectado.",
      400,
      connectionError.message,
    );
  }

  if (!connection) {
    return landingError("bad_request", "Nenhum WhatsApp conectado para esta automacao.", 400);
  }

  const message =
    "Recebemos sua solicitação de teste. Em breve nossa equipe vai entrar em contato para confirmar os detalhes e te ajudar com os próximos passos.";

  try {
    await EvolutionService.sendText(connection.instance_name, phone, message);
  } catch (error) {
    const response = evolutionConfigError(error);

    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }

    return response;
  }

  const metadata = {
    source: "landing_page",
    automation: "SDR Automatizado",
    message,
    contact: {
      id: lead.contact?.id,
      name: lead.contact?.full_name,
      phone,
      email: lead.contact?.email,
    },
    company: lead.contact?.company,
    deal_id: lead.converted_deal_id,
    whatsapp_connection_id: connection.id,
    instance_name: connection.instance_name,
  };

  const { data: activity, error: insertActivityError } = await supabase
    .from("activities")
    .insert({
      entity_type: "lead",
      entity_id: lead.id,
      actor_type: "system",
      actor_id: null,
      action: "landing_test_request_confirmation_sent",
      metadata,
    })
    .select("id")
    .single();

  if (insertActivityError) {
    return landingError(
      "bad_request",
      "Mensagem enviada, mas atividade nao foi registrada.",
      400,
      insertActivityError.message,
    );
  }

  return apiData(
    {
      ok: true,
      already_sent: false,
      activity_id: activity.id,
    },
    { headers: corsHeaders },
  );
}
