UPDATE public.automations
SET
    name = 'CRM Automatizado',
    description = 'Centraliza rotinas operacionais do CRM usando o número conectado como canal de atendimento.',
    icon = 'workflow',
    workflow_id = 'qY51AloY9xGRgZAH',
    webhook_url = 'https://n8n.syncleadteam.com/webhook/synclead-whatsapp-operacao-crm',
    active = true
WHERE name IN ('Atendimento inicial', 'Operação de CRM', 'CRM Automatizado')
   OR workflow_id = 'qY51AloY9xGRgZAH';

UPDATE public.automations
SET
    name = 'SDR Automatizado',
    description = 'Executa prospecção, qualificação inicial e respostas comerciais a partir do WhatsApp conectado.',
    icon = 'messages-square',
    workflow_id = '5Hx3zvwVvXen2NRy',
    webhook_url = 'https://n8n.syncleadteam.com/webhook/synclead-whatsapp-sdr-automatizado',
    active = true
WHERE name IN ('Follow-up comercial', 'SDR Automatizado')
   OR workflow_id = '5Hx3zvwVvXen2NRy';

UPDATE public.automations
SET
    name = 'Social Media Automatizado',
    description = 'Organiza demandas de conteúdo, atendimento social e follow-ups de mídia usando o mesmo número.',
    icon = 'send',
    workflow_id = 'u4zqLusIj1SMQKLs',
    webhook_url = 'https://n8n.syncleadteam.com/webhook/synclead-whatsapp-social-media',
    active = true
WHERE name IN ('Reativacao de leads', 'Social Media', 'Social Media Automatizado')
   OR workflow_id = 'u4zqLusIj1SMQKLs';

INSERT INTO public.automations (name, description, icon, workflow_id, webhook_url, active)
SELECT
    'CRM Automatizado',
    'Centraliza rotinas operacionais do CRM usando o número conectado como canal de atendimento.',
    'workflow',
    'qY51AloY9xGRgZAH',
    'https://n8n.syncleadteam.com/webhook/synclead-whatsapp-operacao-crm',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.automations
    WHERE name = 'CRM Automatizado'
       OR workflow_id = 'qY51AloY9xGRgZAH'
);

INSERT INTO public.automations (name, description, icon, workflow_id, webhook_url, active)
SELECT
    'SDR Automatizado',
    'Executa prospecção, qualificação inicial e respostas comerciais a partir do WhatsApp conectado.',
    'messages-square',
    '5Hx3zvwVvXen2NRy',
    'https://n8n.syncleadteam.com/webhook/synclead-whatsapp-sdr-automatizado',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.automations
    WHERE name = 'SDR Automatizado'
       OR workflow_id = '5Hx3zvwVvXen2NRy'
);

INSERT INTO public.automations (name, description, icon, workflow_id, webhook_url, active)
SELECT
    'Social Media Automatizado',
    'Organiza demandas de conteúdo, atendimento social e follow-ups de mídia usando o mesmo número.',
    'send',
    'u4zqLusIj1SMQKLs',
    'https://n8n.syncleadteam.com/webhook/synclead-whatsapp-social-media',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.automations
    WHERE name = 'Social Media Automatizado'
       OR workflow_id = 'u4zqLusIj1SMQKLs'
);

INSERT INTO public.automations (name, description, icon, workflow_id, webhook_url, active)
SELECT
    'Gestor de Trafego Automatizado',
    'Automatiza rotinas de tráfego pago, acompanhamento de campanhas e alertas operacionais usando o número conectado.',
    'chart-no-axes-column-increasing',
    'pending:gestor-trafego-automatizado',
    null,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.automations
    WHERE name = 'Gestor de Trafego Automatizado'
       OR workflow_id = 'pending:gestor-trafego-automatizado'
);

UPDATE public.automations
SET active = false
WHERE name IN (
    'Atendimento inicial',
    'Follow-up comercial',
    'Reativacao de leads',
    'Operação de CRM',
    'Social Media'
);
