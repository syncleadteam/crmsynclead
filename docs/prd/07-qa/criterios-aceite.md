# Criterios de aceite

## Landing integrada

- A landing carrega agentes e modulos ativos do CRM.
- Produto inativo no CRM nao aparece na landing.
- Envio do formulario cria lead no CRM.
- Atividade do lead contem produtos selecionados e estimativa.

## CRM visual

- Logo SyncLead aparece na sidebar e no login.
- Paleta escura roxo/ciano esta aplicada.
- Interface usa termos: funil, oportunidades, contas, consultor.
- Build de producao conclui sem erro.

## Catalogo da landing

- Admin consegue editar preco, categoria, ordem e status.
- Alteracao de status afeta a landing.
- Lista separa agentes e modulos de forma compreensivel.

## n8n

- Sessao `Automacoes n8n` aparece na navegacao.
- Tutorial mostra base URL, header, endpoints e exemplos de payload.
- Callback sem token retorna 401.
- Callback com token valido atualiza dados.

## Oportunidades

- Oportunidade pode ser movida no funil.
- Valor recalcula quando produtos sao adicionados.
- Proposta pode ser criada a partir da oportunidade.

## Seguranca

- Usuario sem token nao acessa API autenticada.
- Usuario inativo nao acessa CRM.
- Dados respeitam escopo por dono/time.

