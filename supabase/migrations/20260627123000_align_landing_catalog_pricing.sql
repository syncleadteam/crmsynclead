WITH landing_catalog AS (
    SELECT *
    FROM (
        VALUES
            ('attendance_agent', 'Agente de Atendimento', 'Atendimento inteligente 24 horas por dia, 7 dias por semana.', 'SL-AGENT-ATTENDANCE', 99.00::numeric, true, 'agent', 10, '{}'::text[]),
            ('sales_agent', 'Agente de Vendas', 'Qualificação e fechamento automático de oportunidades.', 'SL-AGENT-SALES', 119.00::numeric, true, 'agent', 20, '{}'::text[]),
            ('support_agent', 'Agente de Suporte', 'Suporte técnico inteligente em canal fechado', 'SL-AGENT-SUPPORT', 99.00::numeric, true, 'agent', 30, '{}'::text[]),
            ('faq_ai', 'FAQ Inteligente', 'Responde dúvidas frequentes com base no conhecimento da operação.', 'SL-MOD-FAQ', 39.00::numeric, true, 'module', 40, ARRAY['attendance_agent', 'sales_agent', 'support_agent']),
            ('technical_ai', 'Base Técnica Avançada', 'Usa documentação técnica para responder perguntas mais complexas com precisão.', 'SL-MOD-TECHNICAL', 59.00::numeric, true, 'module', 50, ARRAY['sales_agent', 'support_agent']),
            ('auto_scheduling', 'Agendamento Automático', 'Marca reuniões, serviços e retornos sem intervenção manual.', 'SL-MOD-SCHEDULING', 49.00::numeric, true, 'module', 60, ARRAY['attendance_agent', 'sales_agent', 'support_agent']),
            ('automatic_reminders', 'Lembretes Automáticos', 'Envia lembretes proativos de compromissos, prazos e próximos passos.', 'SL-MOD-REMINDERS', 29.00::numeric, true, 'module', 70, ARRAY['sales_agent', 'support_agent']),
            ('whatsapp_group_notifications', 'Resumo em Grupo WhatsApp', 'Envia resumos objetivos dos atendimentos para acompanhamento da equipe.', 'SL-MOD-WHATSAPP-GROUP', 39.00::numeric, true, 'module', 80, ARRAY['attendance_agent', 'sales_agent', 'support_agent']),
            ('media_sending', 'Envio de Mídia', 'Compartilha imagens, documentos, vídeos e materiais úteis durante o atendimento.', 'SL-MOD-MEDIA', 39.00::numeric, true, 'module', 90, ARRAY['sales_agent', 'support_agent']),
            ('bulk_messaging', 'Disparo em Massa', 'Envia mensagens para listas segmentadas com controle operacional.', 'SL-MOD-BULK', 59.00::numeric, true, 'module', 100, ARRAY['sales_agent', 'support_agent']),
            ('followup', 'Follow-up', 'Acompanha leads e clientes após o primeiro contato.', 'SL-MOD-FOLLOWUP', 39.00::numeric, false, 'module', 110, '{}'::text[]),
            ('commitment_log', 'Registro de Compromissos', 'Registra compromissos importantes e organiza lembretes para acompanhamento.', 'SL-MOD-COMMITMENT-LOG', 29.00::numeric, true, 'module', 120, ARRAY['support_agent']),
            ('calendar_lookup', 'Consulta de Agenda', 'Consulta horários, disponibilidade e compromissos para orientar os próximos passos com rapidez.', 'SL-MOD-CALENDAR-LOOKUP', 39.00::numeric, true, 'module', 130, ARRAY['support_agent']),
            ('number_blocking', 'Bloqueio de Números', 'Permite solicitar o bloqueio de números indesejados e manter a operação protegida.', 'SL-MOD-NUMBER-BLOCKING', 29.00::numeric, true, 'module', 140, ARRAY['support_agent'])
    ) AS catalog(
        landing_form_code,
        name,
        description,
        sku,
        unit_price,
        is_active,
        landing_form_category,
        landing_form_position,
        landing_form_required_agents
    )
)
INSERT INTO public.products (
    name,
    description,
    sku,
    unit_price,
    is_active,
    landing_form_code,
    landing_form_category,
    landing_form_position,
    landing_form_required_agents
)
SELECT
    name,
    description,
    sku,
    unit_price,
    is_active,
    landing_form_code,
    landing_form_category,
    landing_form_position,
    landing_form_required_agents
FROM landing_catalog
ON CONFLICT (landing_form_code) WHERE landing_form_code IS NOT NULL
DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    sku = EXCLUDED.sku,
    unit_price = EXCLUDED.unit_price,
    is_active = EXCLUDED.is_active,
    landing_form_category = EXCLUDED.landing_form_category,
    landing_form_position = EXCLUDED.landing_form_position,
    landing_form_required_agents = EXCLUDED.landing_form_required_agents,
    updated_at = now();

WITH landing_catalog AS (
    SELECT *
    FROM (
        VALUES
            ('attendance_agent', 'Agente de Atendimento', 99.00::numeric, 10),
            ('sales_agent', 'Agente de Vendas', 119.00::numeric, 20),
            ('support_agent', 'Agente de Suporte', 99.00::numeric, 30),
            ('faq_ai', 'FAQ Inteligente', 39.00::numeric, 40),
            ('technical_ai', 'Base Técnica Avançada', 59.00::numeric, 50),
            ('auto_scheduling', 'Agendamento Automático', 49.00::numeric, 60),
            ('automatic_reminders', 'Lembretes Automáticos', 29.00::numeric, 70),
            ('whatsapp_group_notifications', 'Resumo em Grupo WhatsApp', 39.00::numeric, 80),
            ('media_sending', 'Envio de Mídia', 39.00::numeric, 90),
            ('bulk_messaging', 'Disparo em Massa', 59.00::numeric, 100),
            ('followup', 'Follow-up', 39.00::numeric, 110),
            ('commitment_log', 'Registro de Compromissos', 29.00::numeric, 120),
            ('calendar_lookup', 'Consulta de Agenda', 39.00::numeric, 130),
            ('number_blocking', 'Bloqueio de Números', 29.00::numeric, 140)
    ) AS catalog(code, name, unit_price, position)
),
activity_totals AS (
    SELECT
        a.id AS activity_id,
        COALESCE(sum(COALESCE(c.unit_price, NULLIF(module_item.value->>'price', '')::numeric, 0)) FILTER (WHERE module_item.value IS NOT NULL), 0) AS total,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'code', module_item.value->>'code',
                    'name', COALESCE(c.name, module_item.value->>'name'),
                    'price', COALESCE(c.unit_price, NULLIF(module_item.value->>'price', '')::numeric, 0)
                )
                ORDER BY COALESCE(c.position, 999), module_item.ordinality
            ) FILTER (WHERE module_item.value IS NOT NULL),
            '[]'::jsonb
        ) AS modules
    FROM public.activities a
    LEFT JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(a.metadata->'modules') = 'array' THEN a.metadata->'modules'
            ELSE '[]'::jsonb
        END
    ) WITH ORDINALITY AS module_item(value, ordinality) ON true
    LEFT JOIN landing_catalog c ON c.code = module_item.value->>'code'
    WHERE a.action IN ('landing_infrastructure_form_submitted', 'created_from_landing_lead')
    GROUP BY a.id
)
UPDATE public.activities a
SET metadata = jsonb_set(
        jsonb_set(a.metadata, '{modules}', activity_totals.modules, true),
        '{estimated_monthly_total}',
        to_jsonb(activity_totals.total),
        true
    )
FROM activity_totals
WHERE a.id = activity_totals.activity_id;

WITH landing_catalog AS (
    SELECT *
    FROM (
        VALUES
            ('attendance_agent', 99.00::numeric),
            ('sales_agent', 119.00::numeric),
            ('support_agent', 99.00::numeric),
            ('faq_ai', 39.00::numeric),
            ('technical_ai', 59.00::numeric),
            ('auto_scheduling', 49.00::numeric),
            ('automatic_reminders', 29.00::numeric),
            ('whatsapp_group_notifications', 39.00::numeric),
            ('media_sending', 39.00::numeric),
            ('bulk_messaging', 59.00::numeric),
            ('followup', 39.00::numeric),
            ('commitment_log', 29.00::numeric),
            ('calendar_lookup', 39.00::numeric),
            ('number_blocking', 29.00::numeric)
    ) AS catalog(code, unit_price)
),
deal_totals AS (
    SELECT
        (a.metadata->>'converted_deal_id')::uuid AS deal_id,
        COALESCE(sum(COALESCE(c.unit_price, NULLIF(module_item.value->>'price', '')::numeric, 0)) FILTER (WHERE module_item.value IS NOT NULL), 0) AS total
    FROM public.activities a
    LEFT JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN jsonb_typeof(a.metadata->'modules') = 'array' THEN a.metadata->'modules'
            ELSE '[]'::jsonb
        END
    ) AS module_item(value) ON true
    LEFT JOIN landing_catalog c ON c.code = module_item.value->>'code'
    WHERE a.action = 'landing_infrastructure_form_submitted'
      AND a.metadata ? 'converted_deal_id'
      AND NULLIF(a.metadata->>'converted_deal_id', '') IS NOT NULL
    GROUP BY (a.metadata->>'converted_deal_id')::uuid
)
UPDATE public.deals d
SET value = deal_totals.total,
    updated_at = now()
FROM deal_totals
WHERE d.id = deal_totals.deal_id;

WITH landing_catalog AS (
    SELECT *
    FROM (
        VALUES
            ('attendance_agent', 99.00::numeric),
            ('sales_agent', 119.00::numeric),
            ('support_agent', 99.00::numeric),
            ('faq_ai', 39.00::numeric),
            ('technical_ai', 59.00::numeric),
            ('auto_scheduling', 49.00::numeric),
            ('automatic_reminders', 29.00::numeric),
            ('whatsapp_group_notifications', 39.00::numeric),
            ('media_sending', 39.00::numeric),
            ('bulk_messaging', 59.00::numeric),
            ('followup', 39.00::numeric),
            ('commitment_log', 29.00::numeric),
            ('calendar_lookup', 39.00::numeric),
            ('number_blocking', 29.00::numeric)
    ) AS catalog(code, unit_price)
)
UPDATE public.deal_products dp
SET unit_price = landing_catalog.unit_price,
    updated_at = now()
FROM public.products p
JOIN landing_catalog ON landing_catalog.code = p.landing_form_code
WHERE dp.product_id = p.id;
