CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'seller', 'readonly');

CREATE TABLE public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL UNIQUE,
    full_name text,
    role public.user_role NOT NULL DEFAULT 'seller',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    manager_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (team_id, user_id)
);

CREATE INDEX team_members_team_id_idx ON public.team_members(team_id);
CREATE INDEX team_members_user_id_idx ON public.team_members(user_id);
CREATE INDEX teams_manager_id_idx ON public.teams(manager_id);
CREATE INDEX users_role_idx ON public.users(role);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER teams_set_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.users
    WHERE id = auth.uid()
      AND is_active = true
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.current_user_role() = 'admin'::public.user_role
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.current_user_role() = 'manager'::public.user_role
$$;

CREATE OR REPLACE FUNCTION public.can_view_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_admin()
        OR target_user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.teams t
            JOIN public.team_members tm ON tm.team_id = t.id
            WHERE t.manager_id = auth.uid()
              AND tm.user_id = target_user_id
        )
$$;

CREATE OR REPLACE FUNCTION public.can_view_team(target_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.teams t
            WHERE t.id = target_team_id
              AND t.manager_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.team_members tm
            WHERE tm.team_id = target_team_id
              AND tm.user_id = auth.uid()
        )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_team(target_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.teams t
            WHERE t.id = target_team_id
              AND t.manager_id = auth.uid()
              AND public.is_manager()
        )
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_visible
ON public.users
FOR SELECT
TO authenticated
USING (public.can_view_user(id));

CREATE POLICY users_insert_admin
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY users_update_admin
ON public.users
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY teams_select_visible
ON public.teams
FOR SELECT
TO authenticated
USING (public.can_view_team(id));

CREATE POLICY teams_insert_admin_or_manager
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin()
    OR (public.is_manager() AND manager_id = auth.uid())
);

CREATE POLICY teams_update_admin_or_manager
ON public.teams
FOR UPDATE
TO authenticated
USING (public.can_manage_team(id))
WITH CHECK (
    public.is_admin()
    OR (public.is_manager() AND manager_id = auth.uid())
);

CREATE POLICY team_members_select_visible
ON public.team_members
FOR SELECT
TO authenticated
USING (public.can_view_team(team_id) OR user_id = auth.uid());

CREATE POLICY team_members_insert_team_manager
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_team(team_id));

CREATE POLICY team_members_update_team_manager
ON public.team_members
FOR UPDATE
TO authenticated
USING (public.can_manage_team(team_id))
WITH CHECK (public.can_manage_team(team_id));

CREATE POLICY team_members_delete_team_manager
ON public.team_members
FOR DELETE
TO authenticated
USING (public.can_manage_team(team_id));

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_team(uuid) TO authenticated;
