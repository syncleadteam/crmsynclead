CREATE TYPE public.task_type AS ENUM ('call', 'meeting', 'email', 'follow_up', 'other');
CREATE TYPE public.task_status AS ENUM ('pending', 'completed', 'canceled');

CREATE TABLE public.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    type public.task_type NOT NULL DEFAULT 'other',
    related_entity_type public.activity_entity_type NOT NULL,
    related_entity_id uuid NOT NULL,
    due_at timestamptz NOT NULL,
    status public.task_status NOT NULL DEFAULT 'pending',
    assigned_to uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    external_calendar_event_id text,
    completed_at timestamptz,
    canceled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tasks_assigned_to_idx ON public.tasks(assigned_to);
CREATE INDEX tasks_due_at_idx ON public.tasks(due_at);
CREATE INDEX tasks_status_idx ON public.tasks(status);
CREATE INDEX tasks_related_entity_idx ON public.tasks(related_entity_type, related_entity_id);

CREATE TRIGGER tasks_set_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

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
    SELECT EXISTS (
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
    SELECT EXISTS (
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

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select_visible
ON public.tasks
FOR SELECT
TO authenticated
USING (
    public.crm_can_access_owner(assigned_to)
    OR public.crm_can_access_related_entity(related_entity_type, related_entity_id)
);

CREATE POLICY tasks_insert_visible
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
    public.crm_can_write_owner(assigned_to)
    AND public.crm_can_write_related_entity(related_entity_type, related_entity_id)
);

CREATE POLICY tasks_update_visible
ON public.tasks
FOR UPDATE
TO authenticated
USING (
    public.crm_can_write_owner(assigned_to)
    OR public.crm_can_write_related_entity(related_entity_type, related_entity_id)
)
WITH CHECK (
    public.crm_can_write_owner(assigned_to)
    AND public.crm_can_write_related_entity(related_entity_type, related_entity_id)
);

GRANT SELECT, INSERT, UPDATE ON public.tasks TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_can_access_related_entity(public.activity_entity_type, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_can_write_related_entity(public.activity_entity_type, uuid) TO authenticated;
