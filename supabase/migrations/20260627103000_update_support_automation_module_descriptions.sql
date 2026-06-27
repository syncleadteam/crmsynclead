UPDATE public.products
SET description = CASE landing_form_code
    WHEN 'commitment_log' THEN 'Registra compromissos enviados no canal fechado entre o numero pessoal do dono da automacao e o numero da automacao.'
    WHEN 'calendar_lookup' THEN 'Consulta a agenda pelo canal fechado para confirmar horarios, disponibilidade e compromissos sem expor a conversa ao cliente.'
    WHEN 'number_blocking' THEN 'Permite solicitar o bloqueio de numeros diretamente pelo canal fechado, mantendo o controle operacional com o dono da automacao.'
    ELSE description
END,
updated_at = now()
WHERE landing_form_code IN (
    'commitment_log',
    'calendar_lookup',
    'number_blocking'
);
