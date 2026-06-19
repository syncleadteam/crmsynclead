import { EntityList } from "@/components/crm/entity-list";

export default function DealsPage() {
  return (
    <EntityList
      kind="deals"
      title="Deals"
      description="Negociacoes em andamento no funil de vendas."
      fields={[
        { name: "title", label: "Titulo", required: true },
        { name: "contact_id", label: "ID do contato", required: true },
        { name: "company_id", label: "ID da empresa" },
        { name: "pipeline_id", label: "ID do pipeline", required: true },
        { name: "stage_id", label: "ID da etapa", required: true },
        { name: "value", label: "Valor", type: "number" },
        { name: "expected_close_date", label: "Fechamento esperado" },
      ]}
      columns={[
        { key: "title", label: "Titulo" },
        { key: "company.name", label: "Empresa" },
        { key: "contact.full_name", label: "Contato" },
        { key: "stage.name", label: "Etapa" },
        { key: "status", label: "Status" },
        { key: "value", label: "Valor" },
        { key: "owner.full_name", label: "Owner" },
      ]}
    />
  );
}
