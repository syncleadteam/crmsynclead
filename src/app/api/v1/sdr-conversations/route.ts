import { z } from "zod";

import { apiData, apiError, validationError } from "@/lib/api/errors";
import { requirePermission } from "@/lib/api/permissions";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type N8nClient = {
  id: number;
  created_at: string | null;
  telefone: string | null;
  nomewpp: string | null;
  atendimento_ia: boolean | null;
  pausado_em: string | null;
  setor: string | null;
  sessionid: string | null;
};

type N8nChat = {
  id: number;
  created_at: string | null;
  phone: string | null;
  updated_at: string | null;
};

type N8nChatMessage = {
  id: number;
  created_at: string | null;
  phone: string | null;
  nomewpp: string | null;
  bot_message: string | null;
  user_message: string | null;
  message_type: string | null;
  active: boolean | null;
};

type N8nChatHistory = {
  id: number;
  session_id: string | null;
  message: {
    type?: string;
    content?: string;
  } | null;
};

type Conversation = {
  phone: string;
  display_phone: string;
  name: string | null;
  setor: string | null;
  atendimento_ia: boolean | null;
  pausado_em: string | null;
  client_created_at: string | null;
  chat_created_at: string | null;
  last_activity_at: string | null;
  message_count: number;
  inbound_count: number;
  outbound_count: number;
  last_user_message: string | null;
  last_bot_message: string | null;
  messages: N8nChatMessage[];
  histories: N8nChatHistory[];
};

const patchSchema = z.object({
  phone: z.string().min(3),
  atendimento_ia: z.boolean(),
  setor: z.string().trim().max(80).optional().nullable(),
});

function serviceClient() {
  return createSupabaseServiceClient() as ReturnType<
    typeof createSupabaseServiceClient
  > & {
    from: (table: string) => ReturnType<ReturnType<typeof createSupabaseServiceClient>["from"]>;
  };
}

function displayPhone(phone: string) {
  return phone.replace("@s.whatsapp.net", "").replace("@c.us", "");
}

function latestDate(...values: Array<string | null | undefined>) {
  const timestamps = values
    .filter(Boolean)
    .map((value) => Date.parse(value as string))
    .filter(Number.isFinite);

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function compareNullableDate(first: string | null, second: string | null) {
  return Date.parse(second ?? "1970-01-01") - Date.parse(first ?? "1970-01-01");
}

function buildConversations(
  clients: N8nClient[],
  chats: N8nChat[],
  messages: N8nChatMessage[],
  histories: N8nChatHistory[],
) {
  const byPhone = new Map<string, Conversation>();

  const ensure = (phone: string) => {
    const existing = byPhone.get(phone);

    if (existing) {
      return existing;
    }

    const conversation: Conversation = {
      phone,
      display_phone: displayPhone(phone),
      name: null,
      setor: null,
      atendimento_ia: null,
      pausado_em: null,
      client_created_at: null,
      chat_created_at: null,
      last_activity_at: null,
      message_count: 0,
      inbound_count: 0,
      outbound_count: 0,
      last_user_message: null,
      last_bot_message: null,
      messages: [],
      histories: [],
    };

    byPhone.set(phone, conversation);

    return conversation;
  };

  for (const client of clients) {
    const phone = client.telefone ?? client.sessionid;

    if (!phone) {
      continue;
    }

    const conversation = ensure(phone);
    conversation.name = client.nomewpp ?? conversation.name;
    conversation.setor = client.setor;
    conversation.atendimento_ia = client.atendimento_ia;
    conversation.pausado_em = client.pausado_em;
    conversation.client_created_at = client.created_at;
    conversation.last_activity_at = latestDate(conversation.last_activity_at, client.created_at);
  }

  for (const chat of chats) {
    if (!chat.phone) {
      continue;
    }

    const conversation = ensure(chat.phone);
    conversation.chat_created_at = chat.created_at;
    conversation.last_activity_at = latestDate(
      conversation.last_activity_at,
      chat.updated_at,
      chat.created_at,
    );
  }

  for (const message of messages) {
    if (!message.phone) {
      continue;
    }

    const conversation = ensure(message.phone);
    conversation.name = conversation.name ?? message.nomewpp;
    conversation.messages.push(message);
    conversation.message_count += 1;
    conversation.last_activity_at = latestDate(
      conversation.last_activity_at,
      message.created_at,
    );

    if (message.user_message) {
      conversation.inbound_count += 1;
      conversation.last_user_message ??= message.user_message;
    }

    if (message.bot_message) {
      conversation.outbound_count += 1;
      conversation.last_bot_message ??= message.bot_message;
    }
  }

  for (const history of histories) {
    if (!history.session_id) {
      continue;
    }

    ensure(history.session_id).histories.push(history);
  }

  return Array.from(byPhone.values())
    .map((conversation) => ({
      ...conversation,
      messages: conversation.messages
        .sort((first, second) => compareNullableDate(first.created_at, second.created_at))
        .slice(0, 80)
        .reverse(),
      histories: conversation.histories
        .sort((first, second) => first.id - second.id)
        .slice(-120),
    }))
    .sort((first, second) =>
      compareNullableDate(first.last_activity_at, second.last_activity_at),
    );
}

export async function GET(request: Request) {
  const auth = await requirePermission(request, "automations", "view");

  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";

  let supabase: ReturnType<typeof serviceClient>;

  try {
    supabase = serviceClient();
  } catch {
    return apiError("internal_error", "Supabase service role nao configurado.", 500);
  }

  const [clientsResult, chatsResult, messagesResult, historiesResult] = await Promise.all([
    supabase
      .from("n8n_dados_cliente")
      .select("id,created_at,telefone,nomewpp,atendimento_ia,pausado_em,setor,sessionid")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("n8n_chats")
      .select("id,created_at,phone,updated_at")
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("n8n_chat_messages")
      .select("id,created_at,phone,nomewpp,bot_message,user_message,message_type,active")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("n8n_chat_histories")
      .select("id,session_id,message")
      .order("id", { ascending: false })
      .limit(1000),
  ]);

  const firstError =
    clientsResult.error ??
    chatsResult.error ??
    messagesResult.error ??
    historiesResult.error;

  if (firstError) {
    return apiError(
      "bad_request",
      "Nao foi possivel carregar conversas do SDR.",
      400,
      firstError.message,
    );
  }

  const conversations = buildConversations(
    (clientsResult.data ?? []) as N8nClient[],
    (chatsResult.data ?? []) as N8nChat[],
    (messagesResult.data ?? []) as N8nChatMessage[],
    (historiesResult.data ?? []) as N8nChatHistory[],
  ).filter((conversation) => {
    if (!search) {
      return true;
    }

    return [
      conversation.phone,
      conversation.display_phone,
      conversation.name,
      conversation.setor,
      conversation.last_user_message,
      conversation.last_bot_message,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  return apiData({
    conversations,
    stats: {
      total: conversations.length,
      paused: conversations.filter((item) => item.atendimento_ia === false || item.pausado_em).length,
      active_ai: conversations.filter((item) => item.atendimento_ia !== false && !item.pausado_em).length,
      messages: conversations.reduce((sum, item) => sum + item.message_count, 0),
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requirePermission(request, "automations", "update");

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  let supabase: ReturnType<typeof serviceClient>;

  try {
    supabase = serviceClient();
  } catch {
    return apiError("internal_error", "Supabase service role nao configurado.", 500);
  }

  const changes = {
    atendimento_ia: parsed.data.atendimento_ia,
    pausado_em: parsed.data.atendimento_ia ? null : new Date().toISOString(),
    setor: parsed.data.setor ?? undefined,
  };

  const { data, error } = await supabase
    .from("n8n_dados_cliente")
    .update(changes)
    .eq("telefone", parsed.data.phone)
    .select("id,created_at,telefone,nomewpp,atendimento_ia,pausado_em,setor,sessionid")
    .maybeSingle();

  if (error) {
    return apiError(
      "bad_request",
      "Nao foi possivel atualizar atendimento da conversa.",
      400,
      error.message,
    );
  }

  if (!data) {
    return apiError("not_found", "Cliente da conversa nao encontrado.", 404);
  }

  return apiData(data);
}
