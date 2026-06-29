CREATE TABLE public.automations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL DEFAULT 'workflow',
    workflow_id text NOT NULL,
    webhook_url text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_whatsapp_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
    instance_id text NOT NULL,
    instance_name text NOT NULL,
    instance_api_key text,
    phone_number text,
    status text NOT NULL DEFAULT 'connecting',
    n8n_synced_at timestamptz,
    last_status_checked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_whatsapp_connections_user_automation_unique UNIQUE (user_id, automation_id),
    CONSTRAINT user_whatsapp_connections_status_check CHECK (status IN ('connecting', 'connected', 'disconnected', 'error'))
);

CREATE INDEX automations_active_idx ON public.automations(active);
CREATE INDEX user_whatsapp_connections_user_id_idx ON public.user_whatsapp_connections(user_id);
CREATE INDEX user_whatsapp_connections_automation_id_idx ON public.user_whatsapp_connections(automation_id);
CREATE INDEX user_whatsapp_connections_status_idx ON public.user_whatsapp_connections(status);

CREATE TRIGGER automations_set_updated_at
BEFORE UPDATE ON public.automations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_whatsapp_connections_set_updated_at
BEFORE UPDATE ON public.user_whatsapp_connections
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY automations_select_active_or_admin
ON public.automations
FOR SELECT
TO authenticated
USING (active OR public.is_admin());

CREATE POLICY automations_write_admin
ON public.automations
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY user_whatsapp_connections_select_own_or_admin
ON public.user_whatsapp_connections
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY user_whatsapp_connections_insert_own
ON public.user_whatsapp_connections
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY user_whatsapp_connections_update_own_or_admin
ON public.user_whatsapp_connections
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY user_whatsapp_connections_delete_own_or_admin
ON public.user_whatsapp_connections
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

GRANT SELECT ON public.automations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_whatsapp_connections TO authenticated;

INSERT INTO public.automations (name, description, icon, workflow_id, webhook_url, active)
VALUES
    ('Operação de CRM', 'Centraliza rotinas operacionais do CRM usando o número conectado como canal de atendimento.', 'workflow', 'qY51AloY9xGRgZAH', 'https://n8n.syncleadteam.com/webhook/synclead-whatsapp-operacao-crm', true),
    ('SDR Automatizado', 'Executa prospecção, qualificação inicial e respostas comerciais a partir do WhatsApp conectado.', 'messages-square', '5Hx3zvwVvXen2NRy', 'https://n8n.syncleadteam.com/webhook/synclead-whatsapp-sdr-automatizado', true),
    ('Social Media', 'Organiza demandas de conteúdo, atendimento social e follow-ups de mídia usando o mesmo número.', 'send', 'u4zqLusIj1SMQKLs', 'https://n8n.syncleadteam.com/webhook/synclead-whatsapp-social-media', true)
ON CONFLICT DO NOTHING;
