# Permissoes e papeis

## Papeis

### admin

Pode:

- Gerenciar usuarios e times.
- Criar e alterar funis.
- Gerenciar produtos e catalogo da landing.
- Ver dados administrativos.
- Acessar registros conforme politicas RLS.

### manager

Pode:

- Ver e operar dados do proprio time.
- Gerenciar times onde e responsavel, conforme politicas.
- Acompanhar performance de consultores.

### seller

Pode:

- Operar dados sob sua responsabilidade.
- Criar e atualizar contas, contatos, leads, oportunidades, tarefas e propostas dentro do proprio escopo.

### readonly

Uso previsto:

- Consulta sem operacao ativa.
- Deve ser tratado com cuidado em novas rotas para evitar escrita.

## RLS

As politicas usam funcoes:

- `current_user_role()`
- `is_admin()`
- `is_manager()`
- `can_view_user(id)`
- `can_view_team(id)`
- `can_manage_team(id)`
- `crm_can_access_owner(owner_id)`
- `crm_can_write_owner(owner_id)`
- `crm_can_access_related_entity(type, id)`
- `crm_can_write_related_entity(type, id)`

## Escopo

Um usuario ve dados se:

- For admin.
- For dono do registro.
- For manager do time do dono.

Um usuario escreve dados se:

- For admin.
- For dono do registro.
- For manager autorizado no escopo do time.

