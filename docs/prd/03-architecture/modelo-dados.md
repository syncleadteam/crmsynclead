# Modelo de dados

## Entidades principais

```text
users 1--n companies
users 1--n contacts
users 1--n leads
users 1--n deals
users 1--n tasks

teams n--n users via team_members

companies 1--n contacts
contacts 1--n leads
contacts 1--n deals
pipelines 1--n pipeline_stages
pipelines 1--n deals
pipeline_stages 1--n deals

deals 1--n deal_products
products 1--n deal_products
deals 1--n proposals

activities polymorphic -> lead | deal | contact | company
tasks polymorphic -> lead | deal | contact | company
integrations_state polymorphic -> lead | deal | contact | company
```

## Usuarios e times

- `users`: perfil interno, papel, status ativo.
- `teams`: agrupamento comercial com manager.
- `team_members`: relacao usuario-time.

## CRM comercial

- `companies`: contas B2B.
- `contacts`: pessoas de contato.
- `leads`: oportunidades iniciais antes da qualificacao.
- `deals`: oportunidades no funil.
- `pipelines`: funis comerciais.
- `pipeline_stages`: etapas do funil.

## Produtos e propostas

- `products`: catalogo comercial e catalogo da landing.
- `deal_products`: produtos adicionados a uma oportunidade.
- `proposals`: propostas versionadas por oportunidade.
- `audit_logs`: trilha para mudancas auditaveis.

## Agenda e atividades

- `tasks`: agenda operacional.
- `activities`: timeline de eventos de usuario, sistema ou n8n.
- `integrations_state`: status de sincronizacao com sistemas externos.

## Campos da landing em products

- `landing_form_code`
- `landing_form_category`: `agent` ou `module`
- `landing_form_position`
- `landing_form_required_agents`

