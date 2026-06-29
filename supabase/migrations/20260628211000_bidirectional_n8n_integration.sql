CREATE TABLE IF NOT EXISTS public.integration_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    direction text NOT NULL DEFAULT 'crm_to_n8n',
    source text NOT NULL DEFAULT 'crm',
    event_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    responsible_user_id uuid REFERENCES public.users(id),
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending',
    attempts integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 5,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    locked_at timestamptz,
    delivered_at timestamptz,
    last_error text,
    idempotency_key text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT integration_events_direction_check CHECK (direction IN ('crm_to_n8n', 'n8n_to_crm')),
    CONSTRAINT integration_events_status_check CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'dead'))
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_events_idempotency_key_idx
ON public.integration_events(idempotency_key);

CREATE INDEX IF NOT EXISTS integration_events_dispatch_idx
ON public.integration_events(status, next_attempt_at, created_at)
WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS integration_events_entity_idx
ON public.integration_events(entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.integration_event_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.integration_events(id) ON DELETE CASCADE,
    attempt integer NOT NULL,
    status_code integer,
    response_body text,
    error_message text,
    duration_ms integer,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS integration_event_deliveries_event_id_idx
ON public.integration_event_deliveries(event_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.n8n_sync_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    external_id text,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'processed',
    error_message text,
    idempotency_key text NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT n8n_sync_events_status_check CHECK (status IN ('processed', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS n8n_sync_events_idempotency_key_idx
ON public.n8n_sync_events(idempotency_key);

CREATE UNIQUE INDEX IF NOT EXISTS tasks_external_calendar_event_id_unique_idx
ON public.tasks(external_calendar_event_id)
WHERE external_calendar_event_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_integration_event_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS integration_events_set_updated_at ON public.integration_events;
CREATE TRIGGER integration_events_set_updated_at
BEFORE UPDATE ON public.integration_events
FOR EACH ROW
EXECUTE FUNCTION public.set_integration_event_updated_at();

CREATE OR REPLACE FUNCTION public.enqueue_integration_event(
    p_event_type text,
    p_entity_type text,
    p_entity_id uuid,
    p_responsible_user_id uuid,
    p_payload jsonb,
    p_idempotency_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO public.integration_events (
        direction,
        source,
        event_type,
        entity_type,
        entity_id,
        responsible_user_id,
        payload,
        idempotency_key
    )
    VALUES (
        'crm_to_n8n',
        'crm',
        p_event_type,
        p_entity_type,
        p_entity_id,
        p_responsible_user_id,
        COALESCE(p_payload, '{}'::jsonb),
        p_idempotency_key
    )
    ON CONFLICT (idempotency_key) DO UPDATE
    SET payload = EXCLUDED.payload,
        responsible_user_id = EXCLUDED.responsible_user_id
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.integration_contacts_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.enqueue_integration_event(
            'contact.created',
            'contact',
            NEW.id,
            NEW.owner_id,
            jsonb_build_object('record', to_jsonb(NEW)),
            'contact.created:' || NEW.id::text
        );
    ELSIF TG_OP = 'UPDATE' AND (
        OLD.full_name IS DISTINCT FROM NEW.full_name OR
        OLD.email IS DISTINCT FROM NEW.email OR
        OLD.phone IS DISTINCT FROM NEW.phone OR
        OLD.company_id IS DISTINCT FROM NEW.company_id OR
        OLD.owner_id IS DISTINCT FROM NEW.owner_id OR
        OLD.source IS DISTINCT FROM NEW.source
    ) THEN
        PERFORM public.enqueue_integration_event(
            'contact.updated',
            'contact',
            NEW.id,
            NEW.owner_id,
            jsonb_build_object('before', to_jsonb(OLD), 'record', to_jsonb(NEW)),
            'contact.updated:' || NEW.id::text || ':' || extract(epoch from NEW.updated_at)::text
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contacts_integration_events ON public.contacts;
CREATE TRIGGER contacts_integration_events
AFTER INSERT OR UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.integration_contacts_trigger();

CREATE OR REPLACE FUNCTION public.integration_companies_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.enqueue_integration_event(
            'company.created',
            'company',
            NEW.id,
            NEW.owner_id,
            jsonb_build_object('record', to_jsonb(NEW)),
            'company.created:' || NEW.id::text
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_integration_events ON public.companies;
CREATE TRIGGER companies_integration_events
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.integration_companies_trigger();

CREATE OR REPLACE FUNCTION public.integration_deals_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event text;
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.enqueue_integration_event(
            'deal.created',
            'deal',
            NEW.id,
            NEW.owner_id,
            jsonb_build_object('record', to_jsonb(NEW)),
            'deal.created:' || NEW.id::text
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
            PERFORM public.enqueue_integration_event(
                'deal.stage_changed',
                'deal',
                NEW.id,
                NEW.owner_id,
                jsonb_build_object('before', to_jsonb(OLD), 'record', to_jsonb(NEW)),
                'deal.stage_changed:' || NEW.id::text || ':' || extract(epoch from NEW.updated_at)::text
            );
        END IF;

        IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('won', 'lost') THEN
            v_event = CASE WHEN NEW.status = 'won' THEN 'lead.won' ELSE 'lead.lost' END;
            PERFORM public.enqueue_integration_event(
                v_event,
                'deal',
                NEW.id,
                NEW.owner_id,
                jsonb_build_object('before', to_jsonb(OLD), 'record', to_jsonb(NEW)),
                v_event || ':' || NEW.id::text || ':' || extract(epoch from NEW.updated_at)::text
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deals_integration_events ON public.deals;
CREATE TRIGGER deals_integration_events
AFTER INSERT OR UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.integration_deals_trigger();

CREATE OR REPLACE FUNCTION public.integration_tasks_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event text;
    v_before jsonb;
BEGIN
    IF NEW.type <> 'meeting' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_event = 'meeting.created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'canceled' THEN
        v_event = 'meeting.canceled';
    ELSIF TG_OP = 'UPDATE' AND OLD.due_at IS DISTINCT FROM NEW.due_at THEN
        v_event = 'meeting.rescheduled';
    ELSE
        RETURN NEW;
    END IF;

    v_before = CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;

    PERFORM public.enqueue_integration_event(
        v_event,
        'task',
        NEW.id,
        NEW.assigned_to,
        jsonb_build_object('before', v_before, 'record', to_jsonb(NEW)),
        v_event || ':' || NEW.id::text || ':' || extract(epoch from NEW.updated_at)::text
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_integration_events ON public.tasks;
CREATE TRIGGER tasks_integration_events
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.integration_tasks_trigger();

CREATE OR REPLACE FUNCTION public.integration_leads_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event text;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status = 'converted' THEN
            v_event = 'lead.won';
        ELSIF NEW.status = 'disqualified' THEN
            v_event = 'lead.lost';
        ELSE
            RETURN NEW;
        END IF;

        PERFORM public.enqueue_integration_event(
            v_event,
            'lead',
            NEW.id,
            NEW.owner_id,
            jsonb_build_object('before', to_jsonb(OLD), 'record', to_jsonb(NEW)),
            v_event || ':' || NEW.id::text || ':' || extract(epoch from NEW.updated_at)::text
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_integration_events ON public.leads;
CREATE TRIGGER leads_integration_events
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.integration_leads_trigger();

ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_event_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_sync_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integration_events_select_admin_manager ON public.integration_events;
CREATE POLICY integration_events_select_admin_manager
ON public.integration_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN ('admin', 'manager')
          AND u.is_active
    )
);

DROP POLICY IF EXISTS integration_event_deliveries_select_admin_manager ON public.integration_event_deliveries;
CREATE POLICY integration_event_deliveries_select_admin_manager
ON public.integration_event_deliveries
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN ('admin', 'manager')
          AND u.is_active
    )
);

DROP POLICY IF EXISTS n8n_sync_events_select_admin_manager ON public.n8n_sync_events;
CREATE POLICY n8n_sync_events_select_admin_manager
ON public.n8n_sync_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN ('admin', 'manager')
          AND u.is_active
    )
);

GRANT SELECT ON public.integration_events TO authenticated;
GRANT SELECT ON public.integration_event_deliveries TO authenticated;
GRANT SELECT ON public.n8n_sync_events TO authenticated;
