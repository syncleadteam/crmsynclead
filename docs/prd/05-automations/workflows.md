# Workflows

## Workflow 1: qualificacao automatica de lead

1. Trigger: novo lead criado pela landing.
2. n8n consulta detalhes do lead no CRM.
3. n8n envia dados para IA ou regras internas.
4. n8n calcula score.
5. n8n chama `POST /api/v1/leads/{id}/score`.
6. CRM registra atividade e estado da integracao.

## Workflow 2: primeiro contato WhatsApp

1. Trigger: lead novo.
2. n8n consulta contato e contexto da landing.
3. n8n envia mensagem WhatsApp.
4. n8n chama `POST /api/v1/activities`.
5. CRM registra atividade `whatsapp_enviado`.

## Workflow 3: follow-up automatico

1. Trigger: oportunidade parada em uma etapa por periodo definido.
2. n8n consulta oportunidades abertas.
3. n8n envia lembrete ou mensagem ao consultor.
4. n8n cria tarefa via `POST /api/v1/tasks`.
5. CRM exibe tarefa na agenda.

## Workflow 4: agenda comercial

1. Trigger: tarefa de reuniao criada.
2. n8n cria evento no calendario externo.
3. n8n chama `POST /api/v1/tasks/{id}/calendar-sync`.
4. CRM salva ID externo e status sincronizado.

## Workflow 5: proposta e pos-venda

1. Trigger: proposta aprovada.
2. n8n registra atividade.
3. n8n aciona onboarding ou aviso interno.
4. CRM mantem historico na oportunidade.

