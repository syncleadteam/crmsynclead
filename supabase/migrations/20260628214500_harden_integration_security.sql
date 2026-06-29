DROP INDEX IF EXISTS public.integrations_state_provider_entity_unique_idx;

CREATE INDEX IF NOT EXISTS integration_events_responsible_user_id_idx
ON public.integration_events(responsible_user_id)
WHERE responsible_user_id IS NOT NULL;

ALTER FUNCTION public.set_integration_event_updated_at() SET search_path = public;
ALTER FUNCTION public.integration_contacts_trigger() SECURITY DEFINER;
ALTER FUNCTION public.integration_contacts_trigger() SET search_path = public;
ALTER FUNCTION public.integration_companies_trigger() SECURITY DEFINER;
ALTER FUNCTION public.integration_companies_trigger() SET search_path = public;
ALTER FUNCTION public.integration_deals_trigger() SECURITY DEFINER;
ALTER FUNCTION public.integration_deals_trigger() SET search_path = public;
ALTER FUNCTION public.integration_tasks_trigger() SECURITY DEFINER;
ALTER FUNCTION public.integration_tasks_trigger() SET search_path = public;
ALTER FUNCTION public.integration_leads_trigger() SECURITY DEFINER;
ALTER FUNCTION public.integration_leads_trigger() SET search_path = public;

REVOKE ALL ON public.integration_events FROM anon;
REVOKE ALL ON public.integration_event_deliveries FROM anon;
REVOKE ALL ON public.n8n_sync_events FROM anon;

REVOKE EXECUTE ON FUNCTION public.enqueue_integration_event(text, text, uuid, uuid, jsonb, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_integration_event_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.integration_contacts_trigger() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.integration_companies_trigger() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.integration_deals_trigger() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.integration_tasks_trigger() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.integration_leads_trigger() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_integration_event(text, text, uuid, uuid, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_integration_event_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.integration_contacts_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.integration_companies_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.integration_deals_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.integration_tasks_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.integration_leads_trigger() FROM PUBLIC;

DROP POLICY IF EXISTS integration_events_select_admin_manager ON public.integration_events;
CREATE POLICY integration_events_select_admin_manager
ON public.integration_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = (SELECT auth.uid())
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
        WHERE u.id = (SELECT auth.uid())
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
        WHERE u.id = (SELECT auth.uid())
          AND u.role IN ('admin', 'manager')
          AND u.is_active
    )
);
