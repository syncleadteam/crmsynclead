# Endpoints

## Autenticados por usuario Supabase

| Metodo | Endpoint | Uso |
| --- | --- | --- |
| GET | `/api/v1/companies` | listar contas |
| POST | `/api/v1/companies` | criar conta |
| GET | `/api/v1/companies/{id}` | detalhe da conta |
| PATCH | `/api/v1/companies/{id}` | atualizar conta |
| DELETE | `/api/v1/companies/{id}` | soft delete da conta |
| GET | `/api/v1/contacts` | listar contatos |
| POST | `/api/v1/contacts` | criar contato |
| GET | `/api/v1/leads` | listar leads |
| POST | `/api/v1/leads` | criar lead |
| POST | `/api/v1/leads/{id}/convert` | converter lead em oportunidade |
| GET | `/api/v1/deals` | listar oportunidades |
| POST | `/api/v1/deals` | criar oportunidade |
| POST | `/api/v1/deals/{id}/move-stage` | mover etapa |
| GET | `/api/v1/deals/{id}/products` | listar produtos da oportunidade |
| POST | `/api/v1/deals/{id}/products` | adicionar produto |
| GET | `/api/v1/products` | listar produtos |
| POST | `/api/v1/products` | criar produto |
| PATCH | `/api/v1/products/{id}` | atualizar produto |
| GET | `/api/v1/proposals` | listar propostas |
| POST | `/api/v1/proposals` | criar proposta |
| POST | `/api/v1/proposals/{id}/approve` | aprovar proposta |
| GET | `/api/v1/tasks` | listar agenda |
| POST | `/api/v1/tasks` | criar tarefa |
| PATCH | `/api/v1/tasks/{id}` | atualizar tarefa |
| GET | `/api/v1/pipelines` | listar funis |
| POST | `/api/v1/pipelines` | criar funil |
| POST | `/api/v1/pipelines/{id}/stages` | criar etapa |
| GET | `/api/v1/reports/pipeline-summary` | resumo do funil |
| GET | `/api/v1/reports/forecast` | previsao |
| GET | `/api/v1/reports/sales-performance` | performance |
| GET | `/api/v1/integrations-state` | estado de automacoes |

## Callbacks n8n

| Metodo | Endpoint | Uso |
| --- | --- | --- |
| POST | `/api/v1/leads/{id}/score` | atualizar score do lead |
| POST | `/api/v1/activities` | registrar atividade externa |
| POST | `/api/v1/tasks/{id}/calendar-sync` | sincronizar tarefa com calendario |

## RPCs Supabase da landing

| Funcao | Uso |
| --- | --- |
| `get_landing_infrastructure_products()` | listar catalogo ativo |
| `submit_landing_infrastructure_lead(...)` | criar lead da landing |

