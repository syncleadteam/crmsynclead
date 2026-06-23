# Arquitetura do sistema

## Visao geral

O CRM SyncLead usa arquitetura fullstack com Next.js, Supabase e Vercel.

```text
Landing page
  -> Supabase RPC publica
  -> Banco CRM

CRM Next.js
  -> App Router UI
  -> API Routes /api/v1
  -> Supabase Auth + Postgres + RLS

n8n
  -> HTTP Request callbacks
  -> API Routes protegidas por N8N_CALLBACK_TOKEN
```

## Camadas

### Interface

Next.js App Router com componentes React, Tailwind CSS e shadcn base.

### API

Rotas `src/app/api/v1` validam autenticacao, payload e regras de dominio antes de acessar Supabase.

### Banco

Supabase Postgres com migrations SQL, RLS, enums, triggers e funcoes RPC.

### Automacoes

n8n chama endpoints do CRM via HTTP Request. Landing chama RPCs diretamente no Supabase.

## Principios

- Regras sensiveis ficam no backend ou no banco.
- Interface nao recebe service role.
- Automacoes externas usam tokens limitados.
- Dados comerciais respeitam escopo por dono/time.

