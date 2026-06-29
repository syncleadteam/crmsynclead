DROP INDEX IF EXISTS public.tasks_external_calendar_event_id_unique_idx;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_external_calendar_event_id_unique_idx
ON public.tasks(external_calendar_event_id);
