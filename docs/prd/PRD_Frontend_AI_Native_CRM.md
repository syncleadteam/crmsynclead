**PRD — PRODUCT REQUIREMENTS DOCUMENT**

**Front-End**

**AI-Native CRM Platform**

*Documento técnico de referência para desenvolvimento assistido por IA (Codex)*

Versão 1.0 · Junho de 2026

Stack: Next.js · TypeScript · TailwindCSS · Shadcn/UI · React Query · React Hook Form · Zod

# Índice

# 1. Visão Geral do Documento

Este PRD descreve os requisitos funcionais, visuais e técnicos do front-end da plataforma de CRM AI-Native. O documento serve como fonte de verdade para o agente de IA (Codex) responsável pela implementação das interfaces, garantindo consistência entre telas, componentes e fluxos de interação, e total aderência aos contratos definidos no PRD de Back-End.

O front-end é a camada de visualização, operação e acompanhamento do processo comercial. Ele não implementa lógica de automação nem regras de negócio crítica — apenas consome a API do back-end, exibe estados, e envia intenções do usuário (criar, editar, mover, aprovar) por meio dos endpoints já especificados.

## 1.1 Objetivos do Front-End

- Fornecer uma interface rápida, responsiva e agradável para gestão do funil de vendas, com visão Kanban como experiência central.
- Oferecer dashboards com gráficos para acompanhamento de funil, taxa de conversão e forecast de receita.
- Garantir experiência consistente entre desktop e mobile, com adaptação de layout sem perda de funcionalidade essencial.
- Respeitar integralmente o RBAC definido no back-end, ocultando ou desabilitando ações não permitidas para o papel do usuário autenticado.
- Manter feedback visual claro de estados assíncronos (carregando, erro, sucesso, vazio) em todas as interações com a API.

## 1.2 Fora de Escopo

- Regras de negócio de validação crítica (essas residem no back-end; o front-end apenas replica validações de UX para feedback imediato).
- Lógica de automação (disparo de WhatsApp, e-mail, criação de eventos) — apenas exibição do estado resultante.
- Implementação de endpoints de API — já especificados no PRD de Back-End.

# 2. Princípios de Experiência e Design

- Design system baseado em Shadcn/UI sobre TailwindCSS, com tokens de cor, espaçamento e tipografia centralizados e reutilizados em todos os módulos.
- Mobile-first na construção dos componentes de layout, com breakpoints testados em mobile, tablet e desktop.
- Estados de carregamento via skeleton components — nunca tela em branco durante fetch de dados.
- Toda ação destrutiva (excluir, perder negociação, reabrir deal fechado) exige confirmação explícita via diálogo modal.
- Toda ação assíncrona exibe feedback (toast) de sucesso ou erro, com mensagem legível ao usuário final, nunca o erro técnico bruto da API.
- Acessibilidade mínima: navegação por teclado nos formulários e Kanban, contraste adequado (WCAG AA) e labels semânticas nos inputs.

# 3. Arquitetura de Informação e Navegação

## 3.1 Estrutura de Rotas

| Rota | Descrição |
| --- | --- |
| /dashboard | Página inicial com métricas e gráficos consolidados. |
| /pipeline | Visão Kanban do funil de vendas (rota central da aplicação). |
| /deals | Visão em lista/tabela das negociações, com filtros avançados. |
| /deals/[id] | Detalhe de uma negociação: dados, produtos, propostas, atividades. |
| /leads | Lista de leads com filtros por status e score. |
| /leads/[id] | Detalhe de um lead, com ação de conversão para deal. |
| /contacts | Lista de contatos. |
| /contacts/[id] | Detalhe de contato, com histórico de interações. |
| /companies | Lista de empresas (contas). |
| /companies/[id] | Detalhe de empresa, com contatos e deals associados. |
| /tasks | Lista de tarefas e atividades agendadas, com visão de calendário. |
| /proposals | Lista de propostas, com filtro por status (rascunho, enviada, aprovada). |
| /proposals/[id] | Detalhe e versionamento de uma proposta. |
| /reports | Relatórios detalhados: funil, conversão por etapa, forecast, performance por vendedor. |
| /settings/team | Gestão de equipes e usuários (Admin/Gestor). |
| /settings/pipelines | Configuração de pipelines e etapas (Admin). |
| /login | Autenticação via Supabase Auth. |

## 3.2 Navegação Principal

- Sidebar fixa em desktop com ícones + labels para os módulos principais (Dashboard, Pipeline, Leads, Contatos, Empresas, Tarefas, Propostas, Relatórios).
- Em mobile, navegação principal colapsa para um menu inferior (bottom navigation) com os 5 itens mais usados, e os demais acessíveis via menu "Mais".
- Busca global no topo da aplicação, pesquisando contatos, empresas e negociações simultaneamente.

# 4. Módulo Pipeline (Kanban)

O Kanban é a experiência central da aplicação. Ele exibe os deals do pipeline selecionado, organizados em colunas correspondentes às etapas (pipeline_stages), com cards arrastáveis entre colunas.

## 4.1 Estrutura Visual

- Seletor de pipeline no topo, permitindo alternar entre múltiplos funis configurados (ex.: Comercial, Renovação).
- Cada coluna exibe o nome da etapa, contagem de deals e soma do valor total dos deals naquela etapa.
- Cada card exibe: título do deal, nome da empresa/contato, valor, avatar do owner, e indicador visual de atraso (se houver tarefa overdue vinculada).
- Filtros disponíveis: por owner, por intervalo de valor, por data esperada de fechamento, por empresa.

## 4.2 Interação Drag-and-Drop

1. Ao arrastar um card para outra coluna, o front-end dispara otimisticamente a atualização visual e chama POST /api/v1/deals/{id}/move-stage.
2. Em caso de falha na API, o card retorna à coluna original e um toast de erro é exibido.
3. Se a etapa de destino for uma etapa final positiva (ganho), abrir modal de confirmação solicitando valor final e data de fechamento antes de efetivar a movimentação.
4. Se a etapa de destino representar perda (lost), abrir modal exigindo o motivo da perda (lost_reason), replicando a obrigatoriedade definida no back-end.
5. Em dispositivos mobile/tablet, drag-and-drop é substituído por um menu de ação rápida no card ("Mover para...") devido à limitação de gestos de arraste em telas pequenas.

## 4.3 Estados Vazios e Carregamento

- Coluna sem deals exibe estado vazio ilustrado com chamada para ação "Criar negociação nesta etapa".
- Carregamento inicial do board exibe skeleton de colunas e cards, nunca um spinner de tela cheia.

# 5. Módulo Dashboard

O dashboard fornece visão consolidada e visual do desempenho comercial, consumindo dados agregados do endpoint /api/v1/reports/pipeline-summary e demais endpoints de relatório do back-end.

## 5.1 Componentes do Dashboard

| Componente | Tipo de Gráfico | Dados Exibidos |
| --- | --- | --- |
| Funil de Vendas | Gráfico de funil (barras decrescentes) | Quantidade e valor de deals por etapa do pipeline selecionado. |
| Taxa de Conversão | Gráfico de linha (série temporal) | Percentual de leads convertidos em deals, e de deals convertidos em won, por período. |
| Forecast de Receita | Gráfico de barras agrupadas | Valor esperado de fechamento por mês, com base em expected_close_date. |
| Performance por Vendedor | Gráfico de barras horizontais | Ranking de owners por valor total ganho e quantidade de deals fechados. |
| Cards de Métricas Rápidas | Cards numéricos com variação percentual | Total de deals abertos, valor total em pipeline, ticket médio, taxa de ganho. |
| Atividades Recentes | Lista/timeline | Últimas atividades registradas no sistema (independente da entidade). |

## 5.2 Comportamento

- Filtro de período global no topo do dashboard (últimos 7/30/90 dias, mês atual, customizado), refletido em todos os gráficos da página.
- Filtro adicional por equipe/vendedor, respeitando o escopo de visibilidade do papel do usuário autenticado (Vendedor só vê seus próprios dados, salvo se Gestor/Admin).
- Gráficos com estado de carregamento individual (cada card carrega de forma independente, sem bloquear os demais).
- Em mobile, gráficos são reempilhados verticalmente e simplificados (ex.: funil mobile exibe versão compacta em lista com barras de progresso).

# 6. Módulos de Listagem e Detalhe (Leads, Contatos, Empresas, Propostas, Tarefas)

## 6.1 Padrão de Listagem

- Tabela com colunas configuráveis, ordenação por coluna, paginação (consumindo o cursor de paginação da API) e busca textual.
- Filtros específicos por entidade (ex.: leads filtráveis por status e score; tarefas filtráveis por status e data).
- Em mobile, a tabela é substituída por lista de cards verticais com as informações essenciais, mantendo os mesmos filtros via painel deslizante (sheet).

## 6.2 Padrão de Detalhe

- Cabeçalho com identificação principal da entidade e ações rápidas (editar, excluir, reatribuir — condicionadas ao RBAC).
- Abas ou seções para: dados cadastrais, entidades relacionadas (ex.: deals de uma empresa), e timeline de atividades (consumindo /api/v1/activities filtrado pela entidade).
- Formulários de edição utilizam React Hook Form + Zod, com validação client-side espelhando as regras do back-end (ex.: campo obrigatório de motivo ao marcar lead como desqualificado).

## 6.3 Conversão de Lead em Deal

1. Botão "Converter em Negociação" disponível apenas para leads com status qualified.
2. Ao acionar, abre formulário pré-preenchido para seleção de pipeline, etapa inicial e valor estimado.
3. Confirmação chama POST /api/v1/leads/{id}/convert e redireciona o usuário para o detalhe do deal recém-criado.

# 7. Módulo de Propostas

- Listagem de propostas com filtro por status (rascunho, enviada, aprovada) e vínculo ao deal de origem.
- Tela de detalhe exibe histórico de versões da proposta, com a versão mais recente em destaque.
- Proposta com status approved exibe todos os campos como somente leitura, refletindo a imutabilidade definida no back-end; qualquer edição cria uma nova versão.
- Pré-visualização do PDF da proposta embutida na tela de detalhe, com botão de download.

# 8. Módulo de Tarefas e Agenda

- Visão em lista (padrão) e visão de calendário (semanal/mensal) alternáveis por toggle.
- Tarefas com due_at vencido e status pending exibem indicador visual de atraso (badge vermelho "Atrasada").
- Criação rápida de tarefa disponível como ação contextual em qualquer tela de detalhe (lead, deal, contato, empresa), pré-vinculando a entidade de origem.
- Conclusão de tarefa é uma ação de um clique direto na listagem, sem necessidade de abrir o detalhe.

# 9. Responsividade

A aplicação deve ser totalmente responsiva, com paridade de funcionalidades entre desktop e mobile — não apenas leitura, mas também operação completa do funil comercial em dispositivos móveis.

## 9.1 Breakpoints

| Breakpoint | Largura | Comportamento |
| --- | --- | --- |
| Mobile | < 640px | Navegação inferior, listas em cards, Kanban com scroll horizontal e ação "Mover para..." substituindo drag-and-drop. |
| Tablet | 640px – 1024px | Sidebar colapsável, Kanban com colunas reduzidas e drag-and-drop habilitado via touch. |
| Desktop | > 1024px | Sidebar fixa, Kanban com todas as colunas visíveis, dashboards em grade multi-coluna. |

## 9.2 Regras Gerais de Adaptação

- Nenhuma funcionalidade crítica do processo comercial (criar deal, mover etapa, concluir tarefa, aprovar proposta) pode ser exclusiva de desktop.
- Tabelas densas (ex.: relatórios detalhados) podem ser simplificadas em mobile, desde que mantenham acesso aos dados completos via expansão ou tela de detalhe.
- Componentes Shadcn/UI devem ser usados em sua variante responsiva nativa (ex.: Dialog em desktop vira Sheet de tela cheia em mobile, quando aplicável).

# 10. Gerenciamento de Estado e Dados

- React Query como camada de cache e sincronização com a API do back-end, com invalidação de queries após mutações (ex.: mover deal invalida a query do board).
- Atualizações otimistas aplicadas em ações de alta frequência (mover card no Kanban, concluir tarefa), com rollback automático em caso de erro da API.
- Formulários controlados via React Hook Form, com schemas Zod compartilhados (ou espelhados) em relação aos schemas de validação do back-end, evitando divergência de regras.
- Autenticação e sessão gerenciadas via Supabase Auth (client-side), com proteção de rotas no nível de layout (redirecionamento para /login quando não autenticado).

# 11. Controle de Acesso na Interface (RBAC)

O front-end deve refletir fielmente as regras de RBAC definidas no PRD de Back-End, ocultando ou desabilitando elementos de interface que o usuário autenticado não tem permissão de utilizar — nunca dependendo exclusivamente da validação da API para a experiência do usuário.

| Papel | Comportamento na UI |
| --- | --- |
| Admin | Acesso total a todos os módulos, incluindo /settings/team e /settings/pipelines. |
| Gestor | Visualiza dados da equipe; pode reatribuir deals/leads; não acessa configurações globais de pipeline. |
| Vendedor | Visualiza e opera apenas seus próprios registros; ações de reatribuição ficam ocultas. |
| Somente Leitura | Toda a interface é renderizada em modo visualização; botões de criação/edição/exclusão ficam ocultos. |

- Tentativas de acesso direto via URL a rotas não permitidas pelo papel do usuário redirecionam para uma tela de "Acesso não autorizado", nunca exibindo dados parciais.

# 12. Qualidade, Testes e Critérios de Aceite

## 12.1 Pipeline de Validação Obrigatória

Antes de considerar qualquer tarefa de front-end concluída, os seguintes comandos devem ser executados e retornar sem erros:

npm run lint

npm run type-check

npm run test

npm run build

## 12.2 Cobertura de Testes Esperada

- Testes de componente para o Kanban: movimentação de card, modais de confirmação de ganho/perda, estados vazios.
- Testes de formulário: validação de campos obrigatórios e mensagens de erro nos principais fluxos (criação de deal, conversão de lead, criação de proposta).
- Testes E2E (via Playwright MCP) cobrindo os fluxos críticos: login → visualizar pipeline → mover deal → criar tarefa → ver atualização no dashboard.
- Testes visuais de responsividade nos três breakpoints definidos na Seção 9.1, capturando screenshots para validação.

## 12.3 Critérios de Aceite (Definition of Done)

- Todas as rotas listadas na Seção 3.1 estão implementadas e navegáveis conforme o papel do usuário autenticado.
- Kanban permite movimentação de deals entre etapas com persistência confirmada via API e feedback visual imediato.
- Dashboard exibe todos os componentes da Seção 5.1 com dados reais consumidos da API, incluindo estados de carregamento e erro.
- Interface é integralmente operável nos três breakpoints definidos, sem perda de funcionalidade crítica em mobile.
- RBAC está refletido visualmente para os quatro papéis, validado por teste manual ou automatizado em cada papel.
- Pipeline de CI (lint, type-check, test, build) passa sem erros antes de qualquer merge.

# 13. Responsabilidades e Limites do Agente de IA (Codex)

## 13.1 Permitido

- Criar e refatorar componentes de UI seguindo o design system Shadcn/UI estabelecido.
- Implementar páginas e rotas conforme a arquitetura de informação desta especificação.
- Consumir os endpoints já definidos no PRD de Back-End, sem propor novos contratos de API sem alinhamento prévio.
- Executar builds, testes e lint como parte do fluxo de validação.
- Capturar screenshots e validar UI via Playwright MCP.
- Abrir Pull Requests com as alterações propostas e solicitar deploy via Vercel MCP após aprovação.

## 13.2 Proibido

- Implementar lógica de negócio crítica diretamente no front-end (ex.: cálculo de probabilidade de fechamento, regras de scoring) — essa lógica pertence ao back-end.
- Ocultar falhas de autorização apenas no front-end sem validação correspondente já existente na API.
- Introduzir bibliotecas de UI fora do stack definido (TailwindCSS + Shadcn/UI) sem aprovação explícita.
- Remover ou contornar verificações de papel (RBAC) para fins de teste ou conveniência de desenvolvimento.

# 14. Anexo — Glossário

| Termo | Definição |
| --- | --- |
| Kanban | Visualização do pipeline em colunas (etapas) com cards arrastáveis representando deals. |
| Otimistic Update | Atualização imediata da interface antes da confirmação da API, com rollback em caso de falha. |
| Skeleton | Componente visual de carregamento que antecipa o layout do conteúdo real. |
| RBAC | Role-Based Access Control — controle de acesso baseado em papéis, refletido na UI. |
| Forecast | Projeção de receita esperada com base em deals abertos e suas datas de fechamento estimadas. |
