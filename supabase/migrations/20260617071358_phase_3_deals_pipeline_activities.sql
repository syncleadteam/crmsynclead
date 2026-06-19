CREATE TYPE public.deal_status AS ENUM ('open', 'won', 'lost');
CREATE TYPE public.activity_entity_type AS ENUM ('lead', 'deal', 'contact', 'company');
CREATE TYPE public.activity_actor_type AS ENUM ('user', 'system', 'n8n');

ALTER TABLE public.pipeline_stages
ADD CONSTRAINT pipeline_stages_id_pipeline_unique UNIQUE (id, pipeline_id);

CREATE TABLE public.deals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
    contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
    pipeline_id uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE RESTRICT,
    stage_id uuid NOT NULL,
    value numeric(14,2) NOT NULL DEFAULT 0,
    status public.deal_status NOT NULL DEFAULT 'open',
    lost_reason text,
    owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    expected_close_date date,
    closed_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT deals_value_non_negative CHECK (value >= 0),
    CONSTRAINT deals_lost_reason_required CHECK (
        status <> 'lost'::public.deal_status
        OR nullif(trim(lost_reason), '') IS NOT NULL
    ),
    CONSTRAINT deals_stage_in_pipeline FOREIGN KEY (stage_id, pipeline_id)
        REFERENCES public.pipeline_stages(id, pipeline_id)
);

ALTER TABLE public.leads
ADD CONSTRAINT leads_converted_deal_id_fkey
FOREIGN KEY (converted_deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;

CREATE TABLE public.activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type public.activity_entity_type NOT NULL,
    entity_id uuid NOT NULL,
    actor_type public.activity_actor_type NOT NULL,
    actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX deals_company_id_idx ON public.deals(company_id);
CREATE INDEX deals_contact_id_idx ON public.deals(contact_id);
CREATE INDEX deals_pipeline_id_idx ON public.deals(pipeline_id);
CREATE INDEX deals_stage_id_idx ON public.deals(stage_id);
CREATE INDEX deals_owner_id_idx ON public.deals(owner_id);
CREATE INDEX deals_status_idx ON public.deals(status);
CREATE INDEX activities_entity_idx ON public.activities(entity_type, entity_id, created_at DESC);
CREATE INDEX activities_actor_id_idx ON public.activities(actor_id);

CREATE TRIGGER deals_set_updated_at
BEFORE UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY deals_select_visible
ON public.deals
FOR SELECT
TO authenticated
USING (deleted_at IS NULL AND public.crm_can_access_owner(owner_id));

CREATE POLICY deals_insert_owner_scope
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (deleted_at IS NULL AND public.crm_can_write_owner(owner_id));

CREATE POLICY deals_update_owner_scope
ON public.deals
FOR UPDATE
TO authenticated
USING (public.crm_can_write_owner(owner_id))
WITH CHECK (public.crm_can_write_owner(owner_id));

CREATE POLICY activities_select_visible
ON public.activities
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.contacts c
        WHERE entity_type = 'contact'::public.activity_entity_type
          AND c.id = entity_id
          AND c.deleted_at IS NULL
          AND public.crm_can_access_owner(c.owner_id)
    )
    OR EXISTS (
        SELECT 1
        FROM public.companies c
        WHERE entity_type = 'company'::public.activity_entity_type
          AND c.id = entity_id
          AND c.deleted_at IS NULL
          AND public.crm_can_access_owner(c.owner_id)
    )
    OR EXISTS (
        SELECT 1
        FROM public.deals d
        WHERE entity_type = 'deal'::public.activity_entity_type
          AND d.id = entity_id
          AND d.deleted_at IS NULL
          AND public.crm_can_access_owner(d.owner_id)
    )
    OR EXISTS (
        SELECT 1
        FROM public.leads l
        WHERE entity_type = 'lead'::public.activity_entity_type
          AND l.id = entity_id
          AND l.deleted_at IS NULL
          AND public.crm_can_access_owner(l.owner_id)
    )
);

CREATE POLICY activities_insert_user_or_system
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK (
    (actor_type = 'user'::public.activity_actor_type AND actor_id = auth.uid())
    OR (actor_type = 'system'::public.activity_actor_type AND actor_id IS NULL)
    OR public.is_admin()
);

GRANT SELECT, INSERT, UPDATE ON public.deals TO authenticated;
GRANT SELECT, INSERT ON public.activities TO authenticated;
