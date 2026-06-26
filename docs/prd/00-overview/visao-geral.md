# Visao geral do CRM SyncLead

O CRM SyncLead e a central operacional para capturar, organizar e automatizar oportunidades de automacao vindas da landing page, de prospeccao ativa e de workflows externos como n8n.

O produto atual combina:

- CRM comercial com contas, contatos, leads, oportunidades, funis, tarefas, produtos e propostas.
- Integracao da landing page com o formulario de personalizacao de infraestrutura.
- Catalogo de produtos da landing administravel pelo CRM, dividido em agentes e modulos.
- Automacoes via n8n para pontuar leads, registrar atividades e sincronizar agenda.
- RBAC com papeis de admin, manager, seller e readonly.
- Supabase como banco, auth e camada de seguranca com RLS.
- Next.js na interface e nas rotas API.

## Proposta de valor

Permitir que a SyncLead opere como uma agencia de automacoes com processo comercial claro: capturar demanda, entender necessidade, precificar agentes/modulos, acompanhar oportunidades e acionar automacoes sem perder rastreabilidade.

## Estado atual

O CRM ja possui:

- Autenticacao por Supabase.
- Dashboard com indicadores comerciais.
- Funil visual de oportunidades.
- CRUDs operacionais para contas, contatos, leads, produtos, propostas e tarefas.
- Detalhe de lead com conversao para oportunidade.
- Detalhe de oportunidade com produtos e geracao de proposta.
- Configuracoes de equipe, funis, catalogo da landing e integracoes n8n.
- Endpoints REST para entidades principais.
- RPCs publicas para a landing buscar catalogo e enviar lead de infraestrutura.

## Escopo de produto

O CRM deve ser tratado como o backoffice comercial e operacional da SyncLead. A landing capta e qualifica demanda inicial; o CRM guarda o historico e controla itens disponiveis; o n8n executa rotinas automatizadas conectadas aos dados.

