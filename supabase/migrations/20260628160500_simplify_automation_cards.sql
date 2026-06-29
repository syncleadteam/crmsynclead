UPDATE public.automations
SET
    workflow_id = 'r6KMBnNoLxKa18Jd',
    webhook_url = 'https://n8n.syncleadteam.com/webhook/test',
    active = true
WHERE name = 'SDR Automatizado';

UPDATE public.automations
SET active = true
WHERE name = 'CRM Automatizado';

UPDATE public.automations
SET active = false
WHERE name IN (
    'Social Media Automatizado',
    'Gestor de Trafego Automatizado',
    'Social Media'
);
