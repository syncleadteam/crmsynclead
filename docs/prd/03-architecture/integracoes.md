# Integracoes

## Landing page

Tipo: Supabase RPC.

Funcoes:

- `get_landing_infrastructure_products()`: lista agentes e modulos ativos.
- `submit_landing_infrastructure_lead(...)`: cria conta, contato, lead e atividade.

## n8n

Tipo: HTTP callbacks e chamadas REST.

Callbacks:

- `POST /api/v1/leads/{id}/score`
- `POST /api/v1/activities`
- `POST /api/v1/tasks/{id}/calendar-sync`

Autenticacao:

- `Authorization: Bearer <N8N_CALLBACK_TOKEN>` para callbacks.
- `Authorization: Bearer <Supabase access token>` para APIs autenticadas.

## WhatsApp

Status: planejado/externo.

Uso esperado:

- Envio de mensagens de primeiro contato.
- Follow-up automatico.
- Notificacao em grupo.
- Registro de atividade no CRM via n8n.

## E-mail

Status: planejado/externo.

Uso esperado:

- Sequencias de nutricao.
- Envio de proposta.
- Registro de abertura/resposta como atividade.

## Calendario

Status: callback preparado.

Uso esperado:

- Criar evento externo a partir de tarefa.
- Salvar `external_calendar_event_id`.
- Atualizar `integrations_state`.

