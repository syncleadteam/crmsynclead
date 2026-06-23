# Autenticacao

## Usuarios CRM

Usuarios acessam o CRM via Supabase Auth. O frontend obtem a sessao e envia o `access_token` nas chamadas para `/api/v1`.

Header:

```http
Authorization: Bearer <supabase_access_token>
```

O backend valida:

1. Token presente.
2. Token valido no Supabase.
3. Usuario existente em `public.users`.
4. Usuario ativo.
5. Papel autorizado quando a rota exige.

## Papeis

- `admin`
- `manager`
- `seller`
- `readonly`

## n8n

Callbacks n8n nao usam sessao de usuario. Eles usam token compartilhado configurado em variavel de ambiente.

Header:

```http
Authorization: Bearer <N8N_CALLBACK_TOKEN>
```

Variavel:

```text
N8N_CALLBACK_TOKEN
```

## Landing

A landing usa funcoes RPC autorizadas para `anon` quando necessario:

- Buscar catalogo ativo.
- Enviar formulario de infraestrutura.

As RPCs usam `SECURITY DEFINER` e regras internas para selecionar dono ativo e validar produtos.

