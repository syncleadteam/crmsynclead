UPDATE public.user_whatsapp_connections
SET automation_id = (
    SELECT id
    FROM public.automations
    WHERE name = 'SDR Automatizado'
    LIMIT 1
)
WHERE automation_id IN (
    SELECT id
    FROM public.automations
    WHERE name = 'CRM Automatizado'
       OR workflow_id = 'qY51AloY9xGRgZAH'
)
AND EXISTS (
    SELECT 1
    FROM public.automations
    WHERE name = 'SDR Automatizado'
);

DELETE FROM public.automations
WHERE name = 'CRM Automatizado'
   OR workflow_id = 'qY51AloY9xGRgZAH';
