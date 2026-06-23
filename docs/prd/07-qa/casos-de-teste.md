# Casos de teste

## CT-01 Build do CRM

Passos:

1. Rodar `npm run build`.
2. Validar compilacao, TypeScript e geracao de paginas.

Resultado esperado: build finaliza com sucesso.

## CT-02 Catalogo da landing

Passos:

1. Acessar `Catalogo da landing`.
2. Desativar um modulo.
3. Recarregar landing.

Resultado esperado: modulo desativado nao aparece no formulario.

## CT-03 Envio da landing

Passos:

1. Preencher formulario de infraestrutura.
2. Selecionar agentes e modulos ativos.
3. Enviar.
4. Abrir CRM em leads.

Resultado esperado: lead, conta, contato e atividade sao criados.

## CT-04 Produto invalido da landing

Passos:

1. Forcar envio com codigo de produto inativo ou inexistente.

Resultado esperado: RPC rejeita o envio.

## CT-05 Conversao de lead

Passos:

1. Abrir lead qualificado.
2. Selecionar funil e etapa.
3. Converter.

Resultado esperado: oportunidade criada e lead marcado como convertido.

## CT-06 Movimentacao de oportunidade

Passos:

1. Abrir funil.
2. Mover oportunidade para outra etapa.

Resultado esperado: etapa e status sao atualizados.

## CT-07 Callback n8n sem token

Passos:

1. Chamar `POST /api/v1/activities` sem Authorization.

Resultado esperado: API retorna 401.

## CT-08 Callback n8n com token

Passos:

1. Chamar `POST /api/v1/activities` com `Authorization: Bearer <N8N_CALLBACK_TOKEN>`.
2. Enviar entidade, ID, action e metadata.

Resultado esperado: atividade criada com `actor_type = n8n`.

## CT-09 Sincronizacao de calendario

Passos:

1. Criar tarefa.
2. Chamar callback de calendar sync.

Resultado esperado: tarefa recebe `external_calendar_event_id` e estado de integracao e atualizado.

## CT-10 Permissao por escopo

Passos:

1. Autenticar usuario seller.
2. Tentar acessar registro de outro owner sem relacao de time.

Resultado esperado: registro nao e retornado por RLS/API.

