CREATE TABLE public.integrations_state (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    entity_type public.activity_entity_type NOT NULL,
    entity_id uuid NOT NULL,
    external_id text,
    status text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    last_synced_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT integrations_state_provider_entity_unique UNIQUE (provider, entity_type, entity_id)
);

CREATE INDEX integrations_state_provider_idx ON public.integrations_state(provider);
CREATE INDEX integrations_state_entity_idx ON public.integrations_state(entity_type, entity_id);

CREATE TRIGGER integrations_state_set_updated_at
BEFORE UPDATE ON public.integrations_state
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.integrations_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY integrations_state_select_authenticated
ON public.integrations_state
FOR SELECT
TO authenticated
USING (
    public.crm_can_access_related_entity(entity_type, entity_id)
    OR public.is_admin()
);

CREATE POLICY integrations_state_write_admin
ON public.integrations_state
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.integrations_state TO authenticated;
