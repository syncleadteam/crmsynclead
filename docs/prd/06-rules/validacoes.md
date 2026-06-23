# Validacoes

## API

Payloads sao validados com schemas em `src/lib/api/schemas.ts`.

Padroes:

- UUID para IDs.
- Strings com trim e tamanho minimo/maximo.
- Numeros monetarios nao negativos.
- Datas ISO quando aplicavel.
- Enums para status, tipo de tarefa e entidade relacionada.

## Landing

Validacoes principais na RPC:

- Nome do cliente obrigatorio.
- E-mail obrigatorio.
- Nome da empresa obrigatorio.
- Quantidade de agentes restrita aos valores esperados.
- Produtos selecionados precisam estar ativos.

## Oportunidades

- Status ganho exige etapa final positiva.
- Status perdido exige etapa final negativa ou motivo, conforme validacao do backend.
- Etapa deve pertencer ao funil.

## Produtos

- `unit_price >= 0`.
- `landing_form_category` deve ser nula, `agent` ou `module`.
- `landing_form_code` unico quando preenchido.

## Tarefas

- `related_entity_type` deve ser `lead`, `deal`, `contact` ou `company`.
- `related_entity_id` deve apontar para uma entidade acessivel.
- `assigned_to` precisa respeitar escopo de escrita.

## n8n

- Header Bearer obrigatorio.
- Token deve bater com `N8N_CALLBACK_TOKEN`.
- Rate limit aplicado por IP.
- Score deve ficar entre 0 e 100.

