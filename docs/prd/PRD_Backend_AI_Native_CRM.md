**PRD — PRODUCT REQUIREMENTS DOCUMENT**

**Back-End**

**AI-Native CRM Platform**

*Documento técnico de referência para desenvolvimento assistido por IA (Codex)*

Versão 1.0 · Junho de 2026

Stack: Next.js · Supabase (PostgreSQL) · N8N · Vercel

# Índice

# 1. Visão Geral do Documento

Este PRD (Product Requirements Document) descreve, de forma completa e acionável, os requisitos funcionais e técnicos do back-end da plataforma de CRM AI-Native. O documento foi escrito para ser consumido diretamente por um agente de IA (Codex) responsável pela implementação, refatoração e manutenção do código, servindo como fonte de verdade para decisões de modelagem, regras de negócio e contratos de API.

O back-end é a camada responsável por persistir, validar e expor os dados operacionais do processo comercial. Ele não implementa lógica de automação (que permanece centralizada no N8N), mas garante integridade transacional, controle de acesso, auditoria e contratos estáveis de API para o front-end (Next.js) e para os agentes de IA conectados via MCP.

## 1.1 Objetivos do Back-End

- Centralizar o armazenamento de dados comerciais no Supabase (PostgreSQL), como fonte única de verdade.
- Expor uma API própria em Next.js (API Routes / Route Handlers) que sirva de contrato estável entre front-end, automações N8N e agentes de IA.
- Implementar controle de acesso baseado em papéis (RBAC), com granularidade por entidade e por registro.
- Garantir rastreabilidade total de alterações (auditoria) e histórico de atividades por registro.
- Fornecer endpoints estáveis e versionados que o N8N possa consumir para orquestrar automações (calendário, WhatsApp, e-mail).
- Manter o esquema de dados normalizado, documentado e seguro contra duplicação de entidades.

## 1.2 Fora de Escopo

- Lógica de automação de negócio (sequências de mensagens, gatilhos de campanha, follow-ups automáticos) — permanece no N8N.
- Interface visual e componentes de UI — tratados em PRD de front-end separado.
- Lógica de disparo direto de WhatsApp/E-mail/Calendário — o back-end apenas registra o estado resultante dessas integrações, não as executa.

# 2. Contexto Arquitetural

O back-end opera como camada intermediária entre o front-end Next.js e o Supabase, e como provedor de dados para o N8N. A arquitetura geral do sistema é:

CRM (Next.js) → API Back-End (Next.js Route Handlers) → Supabase (PostgreSQL)

Supabase → N8N Automation Layer → Calendar | WhatsApp | Email

Importante: o N8N pode ler e escrever diretamente no Supabase para fins de automação, mas toda escrita originada do CRM deve passar pela API back-end, que aplica validação, autorização e regras de negócio antes de tocar o banco.

## 2.1 Princípios Não-Negociáveis

- Supabase é a fonte única de verdade. Nenhuma entidade de negócio deve ser duplicada em outro armazenamento.
- Toda modificação de esquema requer uma migration versionada — nunca alteração manual direta na tabela.
- O esquema existente deve ser inspecionado antes da criação de qualquer nova entidade, evitando sobreposição de responsabilidades com tabelas já criadas pelo N8N.
- A lógica de negócio comercial (regras de pipeline, scoring, qualificação) reside no back-end do CRM; a lógica de orquestração de canais (disparo, agendamento, mensageria) reside no N8N.
- Toda alteração destrutiva (DROP, DELETE em massa, TRUNCATE) requer aprovação humana explícita antes da execução.

# 3. Papéis de Usuário e Controle de Acesso (RBAC)

O sistema suporta múltiplos usuários com papéis distintos. O controle de acesso deve ser implementado em duas camadas: autorização na API (Next.js Route Handlers) e Row Level Security (RLS) no Supabase como camada de defesa adicional.

## 3.1 Papéis Definidos

| Papel | Descrição | Escopo de Acesso |
| --- | --- | --- |
| Admin | Acesso total à plataforma, incluindo configurações, usuários e papéis. | Todos os registros, todas as entidades, gestão de usuários. |
| Gestor | Supervisiona equipes de vendas; acompanha pipeline e relatórios. | Todos os registros da(s) equipe(s) sob sua gestão; leitura ampla, escrita restrita a reatribuições e aprovações. |
| Vendedor | Opera o dia a dia comercial: leads, contatos, negociações, tarefas. | Apenas registros dos quais é proprietário (owner) ou colaborador, salvo configuração de visibilidade compartilhada da equipe. |
| Somente Leitura | Papel para integrações externas ou auditoria (ex.: contador, parceiro). | Leitura de relatórios e dados agregados, sem acesso a escrita. |

## 3.2 Regras de Autorização

- Toda rota da API deve validar o papel do usuário autenticado antes de processar a requisição.
- Vendedores só podem ler/editar registros de sua propriedade, exceto quando explicitamente compartilhados.
- Gestores têm visibilidade sobre os registros de sua equipe, definida pela tabela de relacionamento usuário-equipe.
- Reatribuição de Leads/Deals entre usuários só pode ser executada por Admin ou Gestor da equipe envolvida.
- Toda ação de escrita sensível (exclusão de registros, mudança de proprietário, exclusão de propostas aprovadas) deve ser registrada na tabela de auditoria.

# 4. Modelo de Dados

As entidades abaixo compõem o domínio do CRM. Antes da criação de qualquer tabela, o agente de IA deve inspecionar o esquema atual do Supabase via Supabase MCP / PostgreSQL MCP para confirmar que a entidade não existe e que não há conflito de nomenclatura com tabelas já utilizadas pelo N8N.

## 4.1 Visão Geral das Entidades

| Entidade | Descrição |
| --- | --- |
| companies | Empresas/contas associadas a contatos e negociações (B2B). |
| contacts | Pessoas físicas vinculadas a uma empresa ou atuando como lead individual. |
| leads | Registros de pré-qualificação, antes de se tornarem oportunidades (deals). |
| deals | Negociações/oportunidades em andamento no funil de vendas. |
| pipelines | Funis de vendas configuráveis (ex.: Comercial, Renovação). |
| pipeline_stages | Etapas de um pipeline, com ordem e probabilidade associada. |
| products | Catálogo de produtos/serviços comercializáveis. |
| deal_products | Itens de produto associados a uma negociação (tabela de junção). |
| proposals | Propostas comerciais geradas para um deal, com versionamento. |
| tasks | Tarefas e atividades agendadas (ligação, reunião, follow-up). |
| activities | Histórico de interações e eventos (timeline) por registro. |
| users | Usuários da plataforma (sincronizados com Supabase Auth). |
| teams | Equipes comerciais, usadas para escopo de visibilidade do Gestor. |
| team_members | Relacionamento entre usuários e equipes. |
| audit_logs | Registro de auditoria de ações sensíveis no sistema. |
| integrations_state | Estado de sincronização com N8N/Calendar/WhatsApp/Email (somente leitura para o CRM). |

## 4.2 Detalhamento das Entidades Principais

### companies

| Campo | Tipo | Regras |
| --- | --- | --- |
| id | uuid (PK) | Gerado automaticamente. |
| name | text | Obrigatório. |
| document_number | text | CNPJ ou equivalente; único quando informado. |
| segment | text | Setor de atuação. |
| owner_id | uuid (FK → users) | Vendedor/Gestor responsável. |
| created_at / updated_at | timestamptz | Preenchidos automaticamente. |

### contacts

| Campo | Tipo | Regras |
| --- | --- | --- |
| id | uuid (PK) | Gerado automaticamente. |
| full_name | text | Obrigatório. |
| email | text | Validado por formato; não obrigatoriamente único (múltiplos contatos podem compartilhar e-mail corporativo). |
| phone | text | Formato E.164 recomendado para integração com WhatsApp via N8N. |
| company_id | uuid (FK → companies, nullable) | Pode ser nulo para contatos individuais. |
| owner_id | uuid (FK → users) | Obrigatório. |
| source | text | Origem do contato (ex.: formulário, indicação, importação). |

### leads

| Campo | Tipo | Regras |
| --- | --- | --- |
| id | uuid (PK) | Gerado automaticamente. |
| contact_id | uuid (FK → contacts) | Obrigatório. |
| status | enum | new, contacted, qualified, disqualified, converted. |
| score | integer | 0–100; pode ser alimentado por automação do N8N. |
| disqualification_reason | text (nullable) | Obrigatório quando status = disqualified. |
| owner_id | uuid (FK → users) | Obrigatório. |
| converted_deal_id | uuid (FK → deals, nullable) | Preenchido na conversão lead → deal. |

### deals

| Campo | Tipo | Regras |
| --- | --- | --- |
| id | uuid (PK) | Gerado automaticamente. |
| title | text | Obrigatório. |
| company_id | uuid (FK → companies, nullable) |  |
| contact_id | uuid (FK → contacts) | Obrigatório. |
| pipeline_id | uuid (FK → pipelines) | Obrigatório. |
| stage_id | uuid (FK → pipeline_stages) | Obrigatório; deve pertencer ao pipeline_id informado. |
| value | numeric(14,2) | Valor estimado da negociação. |
| status | enum | open, won, lost. |
| lost_reason | text (nullable) | Obrigatório quando status = lost. |
| owner_id | uuid (FK → users) | Obrigatório. |
| expected_close_date | date | Opcional, usado em relatórios de forecast. |

### tasks

| Campo | Tipo | Regras |
| --- | --- | --- |
| id | uuid (PK) | Gerado automaticamente. |
| title | text | Obrigatório. |
| type | enum | call, meeting, email, follow_up, other. |
| related_entity_type | enum | lead, deal, contact, company. |
| related_entity_id | uuid | Polimórfico; validado contra related_entity_type na camada de aplicação. |
| due_at | timestamptz | Obrigatório. |
| status | enum | pending, completed, canceled. |
| assigned_to | uuid (FK → users) | Obrigatório. |
| external_calendar_event_id | text (nullable) | Referência ao evento criado pelo N8N no Calendar. |

### activities (timeline)

Tabela append-only que registra o histórico de eventos por entidade (mudança de etapa, criação de tarefa, nota manual, mensagem registrada via N8N). Não deve ser editável após criação — apenas inserção e leitura.

| Campo | Tipo | Regras |
| --- | --- | --- |
| id | uuid (PK) | Gerado automaticamente. |
| entity_type | enum | lead, deal, contact, company. |
| entity_id | uuid | Referência polimórfica. |
| actor_type | enum | user, system, n8n. |
| actor_id | uuid (nullable) | uuid do usuário quando actor_type = user. |
| action | text | Descrição estruturada do evento (ex.: stage_changed, note_added). |
| metadata | jsonb | Dados adicionais do evento (ex.: de/para da etapa). |
| created_at | timestamptz | Imutável. |

### audit_logs

Registra exclusivamente ações sensíveis: exclusões, reatribuições, mudanças de papel de usuário, edição de propostas aprovadas. Não deve ser confundida com a tabela activities (que é orientada a negócio); audit_logs é orientada a segurança e conformidade.

| Campo | Tipo | Regras |
| --- | --- | --- |
| id | uuid (PK) | Gerado automaticamente. |
| actor_id | uuid (FK → users) | Obrigatório. |
| action | text | Ex.: delete_deal, reassign_owner, change_role. |
| target_table | text | Tabela afetada. |
| target_id | uuid | Registro afetado. |
| before / after | jsonb | Snapshot do estado antes/depois da alteração. |
| created_at | timestamptz | Imutável. |

# 5. Regras de Negócio

## 5.1 Ciclo de Vida do Lead

1. Todo lead nasce com status new e deve estar vinculado a um contact existente ou recém-criado.
2. A transição para qualified exige score mínimo configurável ou aprovação manual de um Gestor.
3. A transição para disqualified exige preenchimento obrigatório de disqualification_reason.
4. A conversão de lead em deal (converted) cria um registro em deals e preenche converted_deal_id no lead de origem; o lead original não é removido, apenas marcado como convertido.
5. Um lead não pode ser convertido mais de uma vez.

## 5.2 Ciclo de Vida do Deal (Pipeline)

1. Um deal pertence a exatamente um pipeline e a exatamente uma etapa (stage) dentro desse pipeline em um dado momento.
2. Mudança de etapa deve gerar automaticamente um registro em activities com o tipo stage_changed, contendo etapa de origem e destino.
3. Um deal só pode ser marcado como won a partir de uma etapa configurada como etapa final positiva do pipeline.
4. Um deal marcado como lost exige lost_reason obrigatório e não pode retornar a status open sem ação explícita de reabertura registrada em auditoria.
5. Valor (value) do deal deve ser recalculado automaticamente quando houver alteração nos itens de deal_products vinculados, caso o deal utilize precificação por produtos.

## 5.3 Propostas (Proposals)

- Cada proposta pertence a um único deal e mantém histórico de versões (nunca sobrescreve uma versão anterior; cria uma nova com número incremental).
- Uma proposta aprovada (status = approved) torna-se imutável; qualquer alteração após aprovação exige nova versão e registro em audit_logs.
- A geração do documento da proposta (PDF) é responsabilidade do back-end; o disparo por e-mail é responsabilidade do N8N, que consome o endpoint de status da proposta.

## 5.4 Tarefas e Atividades

- Toda tarefa deve estar vinculada a uma entidade existente (lead, deal, contact ou company); a API deve validar essa relação antes de persistir.
- Tarefas com due_at no passado e status pending devem ser sinalizadas como overdue em tempo de leitura (campo computado, não persistido).
- Conclusão de tarefa deve gerar entrada correspondente em activities.

## 5.5 Integridade e Não-Duplicação

- Antes de criar qualquer entidade nova, a IA deve executar inspeção de esquema (Supabase MCP / PostgreSQL MCP) para confirmar ausência de tabela equivalente.
- Nenhuma tabela usada exclusivamente pelo N8N para orquestração interna deve ser replicada no domínio do CRM; o back-end deve consumi-la via view ou referência, nunca duplicar sua estrutura.
- Campos de e-mail, telefone e documento (CNPJ/CPF) devem ter validação de formato na camada de aplicação antes da persistência.

# 6. Especificação da API

A API é implementada como Next.js Route Handlers (app/api/\*\*/route.ts), seguindo padrão REST, autenticada via Supabase Auth (JWT) e validada com Zod nos contratos de entrada e saída.

## 6.1 Convenções Gerais

- Prefixo de versão: /api/v1/.
- Autenticação obrigatória em todas as rotas, exceto health check; token validado via Supabase Auth.
- Respostas de erro seguem formato padronizado: { error: { code, message, details } }.
- Listagens suportam paginação via cursor (?cursor=&limit=) e filtros via query params documentados por entidade.
- Toda escrita (POST/PATCH/DELETE) deve validar payload com schema Zod antes de qualquer chamada ao Supabase.
- Exclusões lógicas (soft delete) são preferidas a exclusões físicas para entidades de negócio (leads, deals, contacts, companies); exclusão física é restrita a Admin e sempre registrada em audit_logs.

## 6.2 Endpoints por Domínio

| Recurso | Métodos | Descrição |
| --- | --- | --- |
| /api/v1/companies | GET, POST | Lista e cria empresas. |
| /api/v1/companies/{id} | GET, PATCH, DELETE | Detalhe, atualização e exclusão lógica. |
| /api/v1/contacts | GET, POST | Lista e cria contatos. |
| /api/v1/contacts/{id} | GET, PATCH, DELETE | Detalhe, atualização e exclusão lógica. |
| /api/v1/leads | GET, POST | Lista e cria leads. |
| /api/v1/leads/{id} | GET, PATCH | Detalhe e atualização de status/score. |
| /api/v1/leads/{id}/convert | POST | Converte lead em deal. |
| /api/v1/deals | GET, POST | Lista (com filtros por pipeline/stage/owner) e cria negociações. |
| /api/v1/deals/{id} | GET, PATCH, DELETE | Detalhe, atualização e exclusão lógica. |
| /api/v1/deals/{id}/move-stage | POST | Move o deal para outra etapa; gera activity. |
| /api/v1/pipelines | GET, POST | Lista e cria pipelines. |
| /api/v1/pipelines/{id}/stages | GET, POST | Lista e cria etapas de um pipeline. |
| /api/v1/products | GET, POST, PATCH | Catálogo de produtos. |
| /api/v1/deals/{id}/products | GET, POST, DELETE | Itens de produto vinculados ao deal. |
| /api/v1/proposals | GET, POST | Lista e cria propostas. |
| /api/v1/proposals/{id}/approve | POST | Aprova proposta (torna imutável). |
| /api/v1/tasks | GET, POST | Lista e cria tarefas. |
| /api/v1/tasks/{id} | GET, PATCH, DELETE | Detalhe, atualização e cancelamento. |
| /api/v1/activities | GET | Timeline filtrável por entity_type e entity_id. |
| /api/v1/users | GET, POST, PATCH | Gestão de usuários (restrito a Admin). |
| /api/v1/teams | GET, POST, PATCH | Gestão de equipes (restrito a Admin/Gestor). |
| /api/v1/reports/pipeline-summary | GET | Agregações de pipeline para dashboards. |
| /api/v1/health | GET | Health check público, sem autenticação. |

## 6.3 Exemplo de Contrato — Criação de Deal

POST /api/v1/deals

{ "title": "Implantação CRM — Empresa X", "company_id": "uuid", "contact_id": "uuid", "pipeline_id": "uuid", "stage_id": "uuid", "value": 25000, "expected_close_date": "2026-08-15" }

Resposta 201 retorna o objeto criado com id, owner_id (preenchido automaticamente com o usuário autenticado) e timestamps. Erros de validação retornam 422 com detalhamento por campo.

# 7. Integração com N8N e Infraestrutura de MCP

## 7.1 Fronteira de Responsabilidade

O back-end do CRM expõe e consome dados; não dispara comunicações. O N8N é responsável por executar a automação (envio de WhatsApp, e-mail, criação de eventos de calendário) e, ao concluir, atualiza o Supabase com o resultado — seja diretamente, seja via endpoints específicos de callback expostos pelo back-end.

## 7.2 Endpoints de Callback para N8N

| Endpoint | Uso pelo N8N |
| --- | --- |
| /api/v1/tasks/{id}/calendar-sync | Atualiza external_calendar_event_id após criação do evento. |
| /api/v1/leads/{id}/score | Atualiza score do lead após processamento de automação de qualificação. |
| /api/v1/activities (POST, actor_type=n8n) | Registra eventos de canal (mensagem enviada, e-mail aberto) na timeline. |

## 7.3 MCP Servers Relevantes para o Back-End

- Supabase MCP — leitura de esquema, criação e gestão de migrations; usado pela IA antes de qualquer alteração estrutural.
- PostgreSQL MCP — inspeção SQL direta e análise de relacionamentos para validar integridade referencial.
- GitHub MCP — criação de branches e Pull Requests para cada conjunto de alterações do back-end.
- Filesystem MCP — leitura e criação de arquivos de código dentro do projeto.
- N8N MCP — leitura de workflows existentes para garantir que o back-end não duplique lógica já automatizada.
- Context7 MCP — consulta de documentação oficial de bibliotecas (Next.js, Supabase, Zod) durante a implementação.

# 8. Segurança e Conformidade

- Row Level Security (RLS) habilitado em todas as tabelas de negócio no Supabase, espelhando as regras de RBAC definidas na Seção 3.
- Segredos de ambiente (chaves de serviço, tokens) nunca devem ser expostos ao front-end; uso restrito a Route Handlers server-side.
- Toda rota de escrita deve validar propriedade (ownership) ou pertencimento de equipe antes de autorizar a operação.
- Erros de autorização retornam 403 sem detalhar a existência do recurso, para evitar enumeração.
- Rate limiting aplicado nas rotas públicas (health check) e nas rotas de callback do N8N.
- Nenhum comando destrutivo (DROP TABLE, TRUNCATE, exclusão em massa) deve ser executado pela IA sem aprovação humana explícita, conforme já estabelecido no documento base do projeto.

# 9. Qualidade, Testes e Critérios de Aceite

## 9.1 Pipeline de Validação Obrigatória

Antes de considerar qualquer tarefa de back-end concluída, os seguintes comandos devem ser executados e retornar sem erros:

npm run lint

npm run type-check

npm run test

npm run build

## 9.2 Cobertura de Testes Esperada

- Testes unitários para regras de negócio críticas: conversão de lead, transição de etapa de deal, aprovação de proposta.
- Testes de integração para os endpoints principais de cada domínio (CRUD completo).
- Testes de autorização: garantir que um Vendedor não acesse registros de outro Vendedor fora de sua equipe.
- Testes E2E críticos (via Playwright MCP) para os fluxos: criação de deal → movimentação de etapa → geração de proposta → aprovação.

## 9.3 Critérios de Aceite do Back-End (Definition of Done)

- Todas as entidades descritas na Seção 4 existem no Supabase com migrations versionadas e documentadas.
- Todos os endpoints da Seção 6 estão implementados, autenticados e validados com Zod.
- RLS está habilitado e testado para os quatro papéis definidos na Seção 3.
- Auditoria (audit_logs) registra corretamente as ações sensíveis listadas na Seção 8.
- Pipeline de CI (lint, type-check, test, build) passa sem erros antes de qualquer merge.
- Nenhuma tabela ou lógica de negócio do CRM duplica responsabilidade já existente nos workflows do N8N.

# 10. Responsabilidades e Limites do Agente de IA (Codex)

## 10.1 Permitido

- Criar e modificar entidades do back-end, sempre via migration.
- Implementar e refatorar endpoints da API conforme contratos desta especificação.
- Executar builds, testes e lint como parte do fluxo de validação.
- Analisar logs de erro (Sentry) para diagnóstico e correção.
- Abrir Pull Requests com as alterações propostas.
- Realizar deploys aprovados via Vercel MCP.

## 10.2 Proibido

- Excluir bancos de dados ou tabelas sem aprovação humana explícita.
- Destruir ou alterar infraestrutura de produção sem aprovação.
- Remover ou desabilitar rotinas de backup (Restic).
- Executar comandos destrutivos em produção (DELETE em massa, TRUNCATE, DROP) sem revisão e aprovação humana prévia.
- Duplicar lógica de automação já implementada no N8N dentro do back-end do CRM.

# 11. Anexo — Glossário

| Termo | Definição |
| --- | --- |
| Lead | Registro de pré-venda ainda não qualificado como oportunidade real. |
| Deal | Oportunidade comercial em andamento dentro de um pipeline. |
| Pipeline | Funil configurável de etapas pelas quais um deal avança. |
| RLS | Row Level Security — controle de acesso a nível de linha no PostgreSQL. |
| RBAC | Role-Based Access Control — controle de acesso baseado em papéis. |
| MCP | Model Context Protocol — protocolo que permite a agentes de IA interagir com ferramentas externas. |
| Soft delete | Exclusão lógica que marca o registro como inativo sem removê-lo fisicamente. |
