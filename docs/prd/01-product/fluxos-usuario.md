# Fluxos de usuario

## Fluxo: lead da landing

1. Usuario acessa a landing.
2. Seleciona agentes e modulos de infraestrutura.
3. Preenche nome, telefone, e-mail, empresa e segmento.
4. Envia o formulario.
5. Landing chama `submit_landing_infrastructure_lead`.
6. CRM cria ou atualiza conta e contato.
7. CRM cria lead novo e atividade com itens selecionados.
8. Consultor acessa o CRM e faz o atendimento.

## Fluxo: configuracao do catalogo da landing

1. Admin acessa `Catalogo da landing`.
2. Visualiza agentes e modulos.
3. Altera preco, descricao, ordem, categoria ou status.
4. Salva produto.
5. Landing passa a consumir apenas itens ativos via RPC.

## Fluxo: conversao de lead

1. Consultor abre o detalhe do lead.
2. Seleciona funil e etapa inicial.
3. Define titulo, valor e data esperada.
4. Converte o lead.
5. CRM cria oportunidade vinculada ao contato e marca lead como convertido.

## Fluxo: oportunidade e proposta

1. Consultor abre oportunidade.
2. Adiciona produtos da solucao.
3. O valor da oportunidade e recalculado.
4. Consultor cria proposta.
5. Proposta fica versionada e pode ser aprovada.

## Fluxo: automacao n8n

1. Operador acessa `Automacoes n8n`.
2. Copia base URL e endpoint desejado.
3. Cria workflow no n8n com Webhook ou Schedule Trigger.
4. Adiciona HTTP Request com header de autorizacao.
5. Testa com URL de teste do n8n.
6. Ativa workflow e usa URL de producao.
7. Monitora estado no CRM.

