ALTER TABLE public.tasks
ALTER COLUMN related_entity_type DROP NOT NULL,
ALTER COLUMN related_entity_id DROP NOT NULL;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS starts_at timestamptz,
ADD COLUMN IF NOT EXISTS ends_at timestamptz,
ADD COLUMN IF NOT EXISTS google_calendar_id text,
ADD COLUMN IF NOT EXISTS google_calendar_html_link text,
ADD COLUMN IF NOT EXISTS google_calendar_event_status text;

CREATE INDEX IF NOT EXISTS tasks_google_calendar_id_idx
ON public.tasks(google_calendar_id);

CREATE INDEX IF NOT EXISTS tasks_starts_at_idx
ON public.tasks(starts_at);

CREATE OR REPLACE FUNCTION public.crm_can_access_related_entity(
    target_entity_type public.activity_entity_type,
    target_entity_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        target_entity_type IS NULL
        OR target_entity_id IS NULL
        OR EXISTS (
            SELECT 1
            FROM public.leads l
            WHERE target_entity_type = 'lead'::public.activity_entity_type
              AND l.id = target_entity_id
              AND l.deleted_at IS NULL
              AND public.crm_can_access_owner(l.owner_id)
        )
        OR EXISTS (
            SELECT 1
            FROM public.deals d
            WHERE target_entity_type = 'deal'::public.activity_entity_type
              AND d.id = target_entity_id
              AND d.deleted_at IS NULL
              AND public.crm_can_access_owner(d.owner_id)
        )
        OR EXISTS (
            SELECT 1
            FROM public.contacts c
            WHERE target_entity_type = 'contact'::public.activity_entity_type
              AND c.id = target_entity_id
              AND c.deleted_at IS NULL
              AND public.crm_can_access_owner(c.owner_id)
        )
        OR EXISTS (
            SELECT 1
            FROM public.companies c
            WHERE target_entity_type = 'company'::public.activity_entity_type
              AND c.id = target_entity_id
              AND c.deleted_at IS NULL
              AND public.crm_can_access_owner(c.owner_id)
        )
$$;

CREATE OR REPLACE FUNCTION public.crm_can_write_related_entity(
    target_entity_type public.activity_entity_type,
    target_entity_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        target_entity_type IS NULL
        OR target_entity_id IS NULL
        OR EXISTS (
            SELECT 1
            FROM public.leads l
            WHERE target_entity_type = 'lead'::public.activity_entity_type
              AND l.id = target_entity_id
              AND l.deleted_at IS NULL
              AND public.crm_can_write_owner(l.owner_id)
        )
        OR EXISTS (
            SELECT 1
            FROM public.deals d
            WHERE target_entity_type = 'deal'::public.activity_entity_type
              AND d.id = target_entity_id
              AND d.deleted_at IS NULL
              AND public.crm_can_write_owner(d.owner_id)
        )
        OR EXISTS (
            SELECT 1
            FROM public.contacts c
            WHERE target_entity_type = 'contact'::public.activity_entity_type
              AND c.id = target_entity_id
              AND c.deleted_at IS NULL
              AND public.crm_can_write_owner(c.owner_id)
        )
        OR EXISTS (
            SELECT 1
            FROM public.companies c
            WHERE target_entity_type = 'company'::public.activity_entity_type
              AND c.id = target_entity_id
              AND c.deleted_at IS NULL
              AND public.crm_can_write_owner(c.owner_id)
        )
$$;
