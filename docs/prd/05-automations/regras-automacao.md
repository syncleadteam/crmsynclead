# Regras de automacao

## Landing para CRM

Gatilho: envio do formulario de personalizacao de infraestrutura.

Condicoes:

- `client_name` obrigatorio.
- `email` obrigatorio.
- `company_name` obrigatorio.
- `agents_quantity` deve ser `1_agente`, `2_agentes` ou `3_agentes`.
- Todos os codigos selecionados precisam existir e estar ativos no catalogo da landing.

Acoes:

- Selecionar usuario ativo como responsavel.
- Criar ou atualizar conta.
- Criar ou atualizar contato.
- Criar lead novo.
- Calcular score inicial.
- Registrar atividade `landing_infrastructure_form_submitted`.

## Catalogo CRM para landing

Gatilho: carregamento do formulario na landing.

Condicoes:

- Produto ativo.
- `landing_form_code` preenchido.
- Categoria `agent` ou `module`.

Acoes:

- Retornar itens ordenados por categoria, posicao e nome.
- Ocultar produtos inativos.

## n8n: pontuacao de lead

Gatilho: workflow externo chama `POST /api/v1/leads/{id}/score`.

Condicoes:

- Header `Authorization` com `N8N_CALLBACK_TOKEN`.
- Score entre 0 e 100.

Acoes:

- Atualizar `leads.score`.
- Upsert em `integrations_state`.
- Inserir atividade `lead_scored`.

## n8n: registro de atividade

Gatilho: workflow chama `POST /api/v1/activities`.

Condicoes:

- Entidade deve ser `lead`, `deal`, `contact` ou `company`.
- `entity_id` deve ser UUID.
- `action` obrigatoria.

Acoes:

- Inserir atividade com `actor_type = n8n`.

## n8n: calendario

Gatilho: workflow chama `POST /api/v1/tasks/{id}/calendar-sync`.

Condicoes:

- Tarefa existente.
- `external_calendar_event_id` obrigatorio.

Acoes:

- Atualizar tarefa.
- Upsert em `integrations_state`.

