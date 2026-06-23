# Integracoes externas

## n8n

Ferramenta principal de orquestracao.

Usos:

- Webhooks.
- HTTP Request para CRM.
- Schedules.
- Integracao com IA, WhatsApp, e-mail e calendario.

## WhatsApp

Status: planejado via n8n.

Requisitos esperados:

- Enviar mensagens personalizadas.
- Registrar cada envio em `activities`.
- Evitar disparos sem opt-in ou contexto comercial valido.

## E-mail

Status: planejado via n8n.

Requisitos esperados:

- Enviar propostas e follow-ups.
- Registrar abertura, clique ou resposta quando disponivel.
- Vincular eventos a lead, contato ou oportunidade.

## Calendario

Status: callback preparado.

Requisitos esperados:

- Criar evento externo.
- Atualizar `tasks.external_calendar_event_id`.
- Atualizar `integrations_state`.

## IA

Status: planejado via workflow externo.

Usos esperados:

- Score de lead.
- Resumo de atendimento.
- Sugestao de proxima acao.
- Classificacao de interesse por produto.

