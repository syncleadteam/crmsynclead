# Componentes UI

## AppShell

Layout principal com sidebar desktop, nav horizontal mobile e conteudo responsivo. A sidebar exibe logo SyncLead e navegacao operacional.

## Button

Componente baseado em variantes:

- `default`: acao primaria.
- `outline`: acoes secundarias e links externos.
- `ghost`: navegacao e acoes discretas.
- `destructive`: acoes perigosas.
- `link`: links contextuais.

## EntityList

Componente generico para listas CRUD simples. Usado em contas, contatos, leads, oportunidades, produtos e propostas.

Responsabilidades:

- Buscar dados via `crmFetch`.
- Renderizar tabela.
- Renderizar formulario lateral de criacao.
- Aplicar copy e estilo consistente.

## Cards operacionais

Usados para metricas, endpoints, produtos, etapas do funil e passos de tutorial.

Padrao visual:

- `rounded-xl`
- `border`
- `bg-card/70` ou `bg-background/40`
- textos compactos e escaneaveis.

## Formularios

Inputs nativos estilizados com borda, background escuro e foco por `ring`.

Boas praticas:

- Labels simples.
- Campos obrigatorios indicados no schema ou fluxo.
- Mensagens de erro em faixa destructive.

## Tabelas

Usadas para listas e estados de integracao.

Padrao:

- Header com `bg-muted/60`.
- Texto pequeno.
- Linhas com borda inferior.
- Overflow horizontal para mobile.

