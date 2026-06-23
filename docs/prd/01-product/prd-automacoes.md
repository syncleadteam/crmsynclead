# PRD Automacoes

## Objetivo

Permitir que o CRM seja operado por automacoes externas, principalmente n8n, sem perder seguranca, rastreabilidade e consistencia dos dados.

## Automacoes suportadas

### Landing para CRM

O formulario de personalizacao de infraestrutura envia dados para o Supabase RPC. O CRM cria ou atualiza conta, contato, lead e atividade.

### CRM para landing

A landing busca o catalogo ativo no CRM. Produtos inativos deixam de aparecer no formulario.

### n8n para CRM

Callbacks disponiveis:

- Pontuar lead: `POST /api/v1/leads/{lead_id}/score`
- Registrar atividade: `POST /api/v1/activities`
- Sincronizar calendario: `POST /api/v1/tasks/{task_id}/calendar-sync`

### CRM como fonte para n8n

O n8n pode consultar APIs autenticadas para ler leads, oportunidades, tarefas e produtos, desde que use um token de usuario valido.

## Requisitos de seguranca

- Callbacks n8n usam `Authorization: Bearer <N8N_CALLBACK_TOKEN>`.
- APIs de usuario usam access token Supabase.
- Service role fica apenas no servidor do CRM.
- Rate limit aplicado a callbacks e healthcheck.

## Criterios de sucesso

- Workflow do n8n consegue registrar atividade no CRM.
- Pontuacao automatica de lead aparece no lead correto.
- Estado da integracao e atualizado.
- Landing reflete imediatamente produtos ativos do CRM.

