import { EntityList } from "@/components/crm/entity-list";

export default function DealsPage() {
  return (
    <EntityList
      kind="deals"
      title="Oportunidades"
      description="Projetos de automação em negociação, da qualificação ao fechamento."
      fields={[
        { name: "title", label: "Título", required: true },
        { name: "contact_id", label: "ID do contato", required: true },
        { name: "company_id", label: "ID da conta" },
        { name: "pipeline_id", label: "ID do funil", required: true },
        { name: "stage_id", label: "ID da etapa", required: true },
        { name: "value", label: "Valor", type: "number" },
        { name: "expected_close_date", label: "Fechamento esperado" },
      ]}
      columns={[
        { key: "title", label: "Título" },
        { key: "company.name", label: "Conta" },
        { key: "contact.full_name", label: "Contato" },
        { key: "stage.name", label: "Etapa" },
        { key: "status", label: "Status" },
        { key: "value", label: "Valor" },
        { key: "owner.full_name", label: "Consultor" },
      ]}
    />
  );
}
