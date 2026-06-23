# Wireframes

Este diretorio deve concentrar imagens, exports ou links de Figma quando existirem.

## Wireframes textuais atuais

### Layout CRM

```text
+-------------------------------------------------------------+
| Sidebar SyncLead        | Conteudo principal                |
| - Visao geral           | Header da pagina                  |
| - Funil                 | Cards / Tabelas / Formularios     |
| - Oportunidades         |                                    |
| - Contas                |                                    |
| - Automacoes n8n        |                                    |
+-------------------------------------------------------------+
```

### Automacoes n8n

```text
+-------------------------------------------------------------+
| Conexao com n8n                                             |
| [Credencial] [Base URL] [Seguranca]                         |
|                                                             |
| Workflow recomendado       | Callbacks do n8n para CRM       |
| 1. Crie workflow           | POST /leads/{id}/score           |
| 2. HTTP Request            | POST /activities                 |
| 3. Header Bearer           | POST /tasks/{id}/calendar-sync   |
|                                                             |
| CRM como fonte de dados                                      |
| Estado das automacoes                                        |
+-------------------------------------------------------------+
```

### Catalogo da landing

```text
+-------------------------------------------------------------+
| Catalogo da landing                                         |
| Lista de agentes e modulos                                  |
| [Editar preco/status/categoria/ordem]                       |
+-------------------------------------------------------------+
```

