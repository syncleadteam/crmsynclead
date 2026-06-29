DO $$
DECLARE
    table_name text;
    realtime_tables text[] := ARRAY[
        'companies',
        'contacts',
        'leads',
        'deals',
        'tasks',
        'activities',
        'integrations_state',
        'integration_events',
        'integration_event_deliveries',
        'n8n_sync_events'
    ];
BEGIN
    FOREACH table_name IN ARRAY realtime_tables LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = table_name
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
        END IF;
    END LOOP;
END;
$$;
