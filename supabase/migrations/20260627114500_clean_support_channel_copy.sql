UPDATE public.products
SET name = CASE landing_form_code
    WHEN 'number_blocking' THEN 'Bloqueio de Números'
    ELSE name
END,
description = CASE landing_form_code
    WHEN 'support_agent' THEN 'Suporte técnico inteligente em canal fechado'
    WHEN 'commitment_log' THEN 'Registra compromissos importantes e organiza lembretes para acompanhamento.'
    WHEN 'calendar_lookup' THEN 'Consulta horários, disponibilidade e compromissos para orientar os próximos passos com rapidez.'
    WHEN 'number_blocking' THEN 'Permite solicitar o bloqueio de números indesejados e manter a operação protegida.'
    ELSE description
END,
updated_at = now()
WHERE landing_form_code IN (
    'support_agent',
    'commitment_log',
    'calendar_lookup',
    'number_blocking'
);
