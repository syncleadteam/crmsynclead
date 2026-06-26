# PRD Backend

## Objetivo

Fornecer uma API segura para operar o CRM, integrar landing page, receber callbacks do n8n e manter regras de negocio centralizadas.

## Modulos backend

- Autenticacao com Supabase Auth.
- Autorizacao por perfil e RLS.
- Entidades comerciais: contas, contatos, leads, oportunidades, tarefas, produtos e propostas.
- Relatorios de funil, previsao e performance.
- Integracoes: estado de sync, callbacks n8n e RPCs da landing.

## APIs internas

As rotas em `/api/v1` usam `Authorization: Bearer <access_token>` de usuario Supabase, exceto callbacks n8n protegidos por `N8N_CALLBACK_TOKEN`.

Entidades principais:

- `/api/v1/companies`
- `/api/v1/contacts`
- `/api/v1/leads`
- `/api/v1/deals`
- `/api/v1/tasks`
- `/api/v1/products`
- `/api/v1/proposals`
- `/api/v1/pipelines`
- `/api/v1/integrations-state`

## RPCs da landing

- `get_landing_infrastructure_products()`
- `submit_landing_infrastructure_lead(client, agents_quantity, module_codes, observations)`

## Requisitos de backend

- Validar payloads com schemas.
- Garantir escopo de dono/time via RLS e helpers.
- Registrar atividades relevantes.
- Manter soft delete nas entidades comerciais.
- Nao expor service role no frontend ou em automacoes externas.
- Manter integracoes auditaveis em `integrations_state` e `activities`.

