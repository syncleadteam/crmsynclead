UPDATE public.automations
SET
    name = 'Operação de CRM',
    description = 'Centraliza rotinas operacionais do CRM usando o número conectado como canal de atendimento.',
    icon = 'workflow',
    workflow_id = 'qY51AloY9xGRgZAH',
    webhook_url = 'https://n8n.syncleadteam.com/webhook/synclead-whatsapp-operacao-crm'
WHERE name = 'Atendimento inicial';

UPDATE public.automations
SET
    name = 'SDR Automatizado',
    description = 'Executa prospecção, qualificação inicial e respostas comerciais a partir do WhatsApp conectado.',
    icon = 'messages-square',
    workflow_id = '5Hx3zvwVvXen2NRy',
    webhook_url = 'https://n8n.syncleadteam.com/webhook/synclead-whatsapp-sdr-automatizado'
WHERE name = 'Follow-up comercial';

UPDATE public.automations
SET
    name = 'Social Media',
    description = 'Organiza demandas de conteúdo, atendimento social e follow-ups de mídia usando o mesmo número.',
    icon = 'send',
    workflow_id = 'u4zqLusIj1SMQKLs',
    webhook_url = 'https://n8n.syncleadteam.com/webhook/synclead-whatsapp-social-media'
WHERE name = 'Reativacao de leads';
