import { EntityList } from "@/components/crm/entity-list";

export default function ContactsPage() {
  return (
    <EntityList
      kind="contacts"
      title="Contatos"
      description="Pessoas vinculadas a contas, leads e oportunidades de automacao."
      fields={[
        { name: "full_name", label: "Nome completo", required: true },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Telefone" },
        { name: "company_id", label: "ID da conta" },
        { name: "source", label: "Origem" },
      ]}
      columns={[
        { key: "full_name", label: "Nome" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Telefone" },
        { key: "company.name", label: "Conta" },
        { key: "owner.full_name", label: "Consultor" },
      ]}
    />
  );
}
