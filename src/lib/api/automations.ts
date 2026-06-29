import type { SupabaseClient } from "@supabase/supabase-js";

import { EvolutionService, type EvolutionConnectionStatus } from "@/lib/api/evolution";
import { N8nService } from "@/lib/api/n8n-service";
import type { Database, Tables } from "@/types/supabase";

type Automation = Tables<"automations">;
type UserWhatsappConnection = Tables<"user_whatsapp_connections">;
type PublicWhatsappConnection = Pick<
  UserWhatsappConnection,
  | "id"
  | "user_id"
  | "automation_id"
  | "instance_id"
  | "instance_name"
  | "phone_number"
  | "status"
  | "n8n_synced_at"
  | "created_at"
  | "updated_at"
>;

export type AutomationCard = Pick<
  Automation,
  "id" | "name" | "description" | "icon" | "workflow_id" | "webhook_url" | "active"
> & {
  workflow_url: string | null;
  connection: Pick<
    PublicWhatsappConnection,
    | "id"
    | "automation_id"
    | "instance_id"
    | "instance_name"
    | "phone_number"
    | "status"
    | "created_at"
    | "updated_at"
  > | null;
};

const automationSelect =
  "id,name,description,icon,workflow_id,webhook_url,active,created_at,updated_at";
const connectionSelect =
  "id,user_id,automation_id,instance_id,instance_name,phone_number,status,n8n_synced_at,created_at,updated_at";

function workflowUrl(workflowId: string) {
  if (workflowId.startsWith("pending:")) {
    return null;
  }

  const baseUrl = (process.env.N8N_APP_URL ?? process.env.N8N_API_URL)?.replace(/\/+$/, "");

  return baseUrl ? `${baseUrl}/workflow/${encodeURIComponent(workflowId)}` : null;
}

const automationOrder = ["SDR Automatizado"];

function automationPosition(name: string) {
  const index = automationOrder.indexOf(name);

  return index === -1 ? automationOrder.length : index;
}

export function buildInstanceName(userId: string, automationId: string) {
  return `crm-${userId.slice(0, 8)}-${automationId.slice(0, 8)}`;
}

export const AutomationService = {
  async listCards(supabase: SupabaseClient<Database>, userId: string) {
    const [{ data: automations, error: automationsError }, { data: connections, error: connectionsError }] =
      await Promise.all([
        supabase
          .from("automations")
          .select(automationSelect)
          .eq("active", true)
          .order("name", { ascending: true }),
        supabase
          .from("user_whatsapp_connections")
          .select(connectionSelect)
          .eq("user_id", userId),
      ]);

    if (automationsError) {
      throw automationsError;
    }

    if (connectionsError) {
      throw connectionsError;
    }

    const sharedConnection =
      (connections ?? []).find((connection) =>
        connection.status !== "disconnected" && connection.status !== "error",
      ) ??
      (connections ?? [])[0] ??
      null;

    return (automations ?? []).map((automation) => ({
      ...automation,
      workflow_url: workflowUrl(automation.workflow_id),
      connection: sharedConnection,
    })).sort((first, second) => (
      automationPosition(first.name) - automationPosition(second.name) ||
      first.name.localeCompare(second.name)
    )) satisfies AutomationCard[];
  },

  async getAutomation(supabase: SupabaseClient<Database>, automationId: string) {
    const { data, error } = await supabase
      .from("automations")
      .select(automationSelect)
      .eq("id", automationId)
      .eq("active", true)
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async getConnection(
    supabase: SupabaseClient<Database>,
    userId: string,
    automationId: string,
  ) {
    const { data: exact, error: exactError } = await supabase
      .from("user_whatsapp_connections")
      .select(connectionSelect)
      .eq("user_id", userId)
      .eq("automation_id", automationId)
      .maybeSingle();

    if (exactError) {
      throw exactError;
    }

    if (exact) {
      return exact;
    }

    return this.getSharedConnection(supabase, userId);
  },

  async getSharedConnection(supabase: SupabaseClient<Database>, userId: string) {
    const { data, error } = await supabase
      .from("user_whatsapp_connections")
      .select(connectionSelect)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return (
      (data ?? []).find((connection) =>
        connection.status !== "disconnected" && connection.status !== "error",
      ) ??
      (data ?? [])[0] ??
      null
    );
  },

  async createConnection(
    supabase: SupabaseClient<Database>,
    userId: string,
    automationId: string,
  ) {
    await this.getAutomation(supabase, automationId);

    const existing = await this.getSharedConnection(supabase, userId);

    if (existing && existing.status !== "disconnected" && existing.status !== "error") {
      const qrcode =
        existing.status === "connected"
          ? null
          : await EvolutionService.getQrCode(existing.instance_name).catch(() => null);

      return { connection: existing, qrcode };
    }

    const instanceName = buildInstanceName(userId, automationId);
    const instance = await EvolutionService.createInstance(instanceName);

    const payload = {
      user_id: userId,
      automation_id: automationId,
      instance_id: instance.instanceId,
      instance_name: instance.instanceName,
      instance_api_key: instance.instanceApiKey,
      status: instance.status,
      phone_number: null,
    };

    const query = existing
      ? supabase
          .from("user_whatsapp_connections")
          .update(payload)
          .eq("id", existing.id)
          .select(connectionSelect)
      : supabase
          .from("user_whatsapp_connections")
          .insert(payload)
          .select(connectionSelect);

    const { data, error } = await query.single();

    if (error) {
      throw error;
    }

    return { connection: data, qrcode: instance.qrcode };
  },

  async updateStatus(
    supabase: SupabaseClient<Database>,
    userId: string,
    automationId: string,
  ) {
    await this.getAutomation(supabase, automationId);

    const connection = await this.getSharedConnection(supabase, userId);

    if (!connection) {
      return { connection: null, qrcode: null };
    }

    const status = await EvolutionService.getConnectionStatus(connection.instance_name);
    const updated = await this.persistStatus(supabase, connection, status);

    if (updated.status === "connected" && !updated.n8n_synced_at) {
      await this.syncAllN8n(supabase, updated);
    }

    return { connection: updated, qrcode: null };
  },

  async persistStatus(
    supabase: SupabaseClient<Database>,
    connection: PublicWhatsappConnection,
    status: EvolutionConnectionStatus,
  ) {
    const { data, error } = await supabase
      .from("user_whatsapp_connections")
      .update({
        status: status.status,
        phone_number: status.phoneNumber ?? connection.phone_number,
        last_status_checked_at: new Date().toISOString(),
      })
      .eq("id", connection.id)
      .select(connectionSelect)
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async syncN8n(
    supabase: SupabaseClient<Database>,
    automation: Pick<Automation, "workflow_id" | "webhook_url">,
    connection: PublicWhatsappConnection,
  ) {
    const timestamp = new Date().toISOString();

    await N8nService.activateWorkflow(automation.workflow_id);

    if (automation.webhook_url) {
      await EvolutionService.setWebhook(connection.instance_name, automation.webhook_url);
    }

    const { data, error } = await supabase
      .from("user_whatsapp_connections")
      .update({ n8n_synced_at: timestamp })
      .eq("id", connection.id)
      .select(connectionSelect)
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async activateAutomation(
    supabase: SupabaseClient<Database>,
    userId: string,
    automationId: string,
  ) {
    const automation = await this.getAutomation(supabase, automationId);
    const connection = await this.getSharedConnection(supabase, userId);

    if (!connection || connection.status !== "connected") {
      return {
        connection,
        qrcode: null,
        activated: false,
        needsConnection: true,
      };
    }

    const updated = await this.syncN8n(supabase, automation, connection);

    return {
      connection: updated,
      qrcode: null,
      activated: true,
      needsConnection: false,
    };
  },

  async syncAllN8n(
    supabase: SupabaseClient<Database>,
    connection: PublicWhatsappConnection,
  ) {
    const { data: automations, error } = await supabase
      .from("automations")
      .select(automationSelect)
      .eq("active", true);

    if (error) {
      throw error;
    }

    for (const automation of automations ?? []) {
      await N8nService.activateWorkflow(automation.workflow_id);

      if (automation.webhook_url) {
        await EvolutionService.setWebhook(connection.instance_name, automation.webhook_url);
      }
    }

    const { data, error: updateError } = await supabase
      .from("user_whatsapp_connections")
      .update({ n8n_synced_at: new Date().toISOString() })
      .eq("id", connection.id)
      .select(connectionSelect)
      .single();

    if (updateError) {
      throw updateError;
    }

    return data;
  },

  async disconnect(
    supabase: SupabaseClient<Database>,
    userId: string,
    automationId: string,
  ) {
    await this.getAutomation(supabase, automationId);

    const connection = await this.getSharedConnection(supabase, userId);

    if (!connection) {
      return null;
    }

    await EvolutionService.disconnectInstance(connection.instance_name);

    const { data, error } = await supabase
      .from("user_whatsapp_connections")
      .update({
        status: "disconnected",
        phone_number: null,
        n8n_synced_at: null,
      })
      .eq("id", connection.id)
      .select(connectionSelect)
      .single();

    if (error) {
      throw error;
    }

    return data;
  },
};
