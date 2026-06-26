# Regras de negocio

## Leads

- Lead deve estar vinculado a um contato.
- Lead tem score entre 0 e 100.
- Lead desqualificado exige motivo.
- Lead convertido pode apontar para oportunidade.

## Oportunidades

- Oportunidade deve ter contato, funil, etapa e responsavel.
- Valor nao pode ser negativo.
- Status permitido: `open`, `won`, `lost`.
- Oportunidade perdida exige motivo.
- Etapa deve pertencer ao funil selecionado.
- Etapa marcada como ganha/perdida deriva status da oportunidade.

## Produtos

- Preco unitario nao pode ser negativo.
- SKU e unico quando informado.
- Produto pode ser usado no catalogo comercial e no formulario da landing.
- Produto da landing deve ter codigo unico quando informado.

## Produtos da landing

- Categoria permitida: `agent` ou `module`.
- Apenas produtos ativos aparecem na landing.
- Modulos podem declarar agentes requeridos.
- Landing rejeita produtos inativos ou invalidos no envio.

## Propostas

- Proposta pertence a uma oportunidade.
- Versao deve ser positiva.
- Par `(deal_id, version)` deve ser unico.
- Proposta aprovada recebe `approved_at`.
- Proposta aprovada nao deve ser alterada pelo fluxo comum.

## Tarefas

- Tarefa deve ter entidade relacionada.
- Tarefa deve ter responsavel e data.
- Status permitido: `pending`, `completed`, `canceled`.

## Integracoes

- Estado de integracao e unico por `provider`, `entity_type`, `entity_id`.
- Callbacks n8n devem registrar atividade ou estado quando mudarem dados.

