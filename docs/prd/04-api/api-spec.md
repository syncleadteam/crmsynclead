# API spec

## Base URL

Producao:

```text
https://crm-sync-lead.vercel.app
```

## Formato padrao

Respostas de sucesso:

```json
{
  "data": {}
}
```

Erros:

```json
{
  "error": {
    "code": "bad_request",
    "message": "Mensagem em portugues",
    "details": "Detalhes opcionais"
  }
}
```

## Autenticacao

APIs do CRM:

```http
Authorization: Bearer <supabase_access_token>
```

Callbacks n8n:

```http
Authorization: Bearer <N8N_CALLBACK_TOKEN>
```

## Recursos

- Companies: contas.
- Contacts: contatos.
- Leads: leads.
- Deals: oportunidades.
- Pipelines: funis.
- Products: produtos.
- Proposals: propostas.
- Tasks: agenda.
- Activities: timeline.
- Integrations state: estado de automacoes.

## Healthcheck

```http
GET /api/v1/health
```

Retorna status basico do servico.

