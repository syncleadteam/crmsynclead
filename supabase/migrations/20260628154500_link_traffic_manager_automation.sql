UPDATE public.automations
SET
    workflow_id = '0gU9jKWIOMKOYEyV',
    webhook_url = 'https://n8n.syncleadteam.com/webhook/synclead-whatsapp-gestor-trafego-automatizado',
    active = true
WHERE name = 'Gestor de Trafego Automatizado'
   OR workflow_id = 'pending:gestor-trafego-automatizado';
