CREATE TYPE public.lead_status AS ENUM (
    'new',
    'contacted',
    'qualified',
    'disqualified',
    'converted'
);

CREATE TABLE public.companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    document_number text,
    segment text,
    owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    email text,
    phone text,
    company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
    owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    source text,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pipelines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pipeline_stages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
    name text NOT NULL,
    position integer NOT NULL,
    probability integer NOT NULL DEFAULT 0,
    is_won_stage boolean NOT NULL DEFAULT false,
    is_lost_stage boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pipeline_stages_probability_range CHECK (probability >= 0 AND probability <= 100),
    CONSTRAINT pipeline_stages_position_unique UNIQUE (pipeline_id, position)
);

CREATE TABLE public.leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
    status public.lead_status NOT NULL DEFAULT 'new',
    score integer NOT NULL DEFAULT 0,
    disqualification_reason text,
    owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    converted_deal_id uuid,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT leads_score_range CHECK (score >= 0 AND score <= 100),
    CONSTRAINT leads_disqualified_reason_required CHECK (
        status <> 'disqualified'::public.lead_status
        OR nullif(trim(disqualification_reason), '') IS NOT NULL
    )
);

CREATE INDEX companies_owner_id_idx ON public.companies(owner_id);
CREATE UNIQUE INDEX companies_document_number_unique_idx
ON public.companies(document_number)
WHERE document_number IS NOT NULL;
CREATE INDEX contacts_owner_id_idx ON public.contacts(owner_id);
CREATE INDEX contacts_company_id_idx ON public.contacts(company_id);
CREATE INDEX leads_contact_id_idx ON public.leads(contact_id);
CREATE INDEX leads_owner_id_idx ON public.leads(owner_id);
CREATE INDEX leads_status_idx ON public.leads(status);
CREATE INDEX pipeline_stages_pipeline_id_idx ON public.pipeline_stages(pipeline_id);

CREATE TRIGGER companies_set_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER contacts_set_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER leads_set_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER pipelines_set_updated_at
BEFORE UPDATE ON public.pipelines
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER pipeline_stages_set_updated_at
BEFORE UPDATE ON public.pipeline_stages
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.crm_can_access_owner(target_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_admin()
        OR target_owner_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.teams t
            JOIN public.team_members tm ON tm.team_id = t.id
            WHERE t.manager_id = auth.uid()
              AND tm.user_id = target_owner_id
        )
$$;

CREATE OR REPLACE FUNCTION public.crm_can_write_owner(target_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_admin()
        OR target_owner_id = auth.uid()
        OR (
            public.is_manager()
            AND EXISTS (
                SELECT 1
                FROM public.teams t
                JOIN public.team_members tm ON tm.team_id = t.id
                WHERE t.manager_id = auth.uid()
                  AND tm.user_id = target_owner_id
            )
        )
$$;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY companies_select_visible
ON public.companies
FOR SELECT
TO authenticated
USING (deleted_at IS NULL AND public.crm_can_access_owner(owner_id));

CREATE POLICY companies_insert_owner_scope
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (deleted_at IS NULL AND public.crm_can_write_owner(owner_id));

CREATE POLICY companies_update_owner_scope
ON public.companies
FOR UPDATE
TO authenticated
USING (public.crm_can_write_owner(owner_id))
WITH CHECK (public.crm_can_write_owner(owner_id));

CREATE POLICY contacts_select_visible
ON public.contacts
FOR SELECT
TO authenticated
USING (deleted_at IS NULL AND public.crm_can_access_owner(owner_id));

CREATE POLICY contacts_insert_owner_scope
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (deleted_at IS NULL AND public.crm_can_write_owner(owner_id));

CREATE POLICY contacts_update_owner_scope
ON public.contacts
FOR UPDATE
TO authenticated
USING (public.crm_can_write_owner(owner_id))
WITH CHECK (public.crm_can_write_owner(owner_id));

CREATE POLICY leads_select_visible
ON public.leads
FOR SELECT
TO authenticated
USING (deleted_at IS NULL AND public.crm_can_access_owner(owner_id));

CREATE POLICY leads_insert_owner_scope
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (deleted_at IS NULL AND public.crm_can_write_owner(owner_id));

CREATE POLICY leads_update_owner_scope
ON public.leads
FOR UPDATE
TO authenticated
USING (public.crm_can_write_owner(owner_id))
WITH CHECK (public.crm_can_write_owner(owner_id));

CREATE POLICY pipelines_select_authenticated
ON public.pipelines
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY pipelines_write_admin
ON public.pipelines
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY pipeline_stages_select_authenticated
ON public.pipeline_stages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY pipeline_stages_write_admin
ON public.pipeline_stages
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pipelines TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pipeline_stages TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_can_access_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_can_write_owner(uuid) TO authenticated;
