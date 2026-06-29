REVOKE EXECUTE ON FUNCTION public.enqueue_integration_event(text, text, uuid, uuid, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_integration_event_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.integration_contacts_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.integration_companies_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.integration_deals_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.integration_tasks_trigger() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.integration_leads_trigger() FROM PUBLIC;
