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
VALUES
    ('Registro de Compromissos', 'Captura e organiza compromissos informados durante o atendimento.', 'SL-MOD-COMMITMENT-LOG', 147.00, true, 'commitment_log', 'module', 120, ARRAY['support_agent']),
    ('Consulta de Agenda', 'Consulta disponibilidade e compromissos registrados para orientar o atendimento.', 'SL-MOD-CALENDAR-LOOKUP', 197.00, true, 'calendar_lookup', 'module', 130, ARRAY['support_agent']),
    ('Bloqueio de Numeros', 'Identifica e bloqueia numeros indesejados ou recorrentes conforme regras da operacao.', 'SL-MOD-NUMBER-BLOCKING', 147.00, true, 'number_blocking', 'module', 140, ARRAY['support_agent'])
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
