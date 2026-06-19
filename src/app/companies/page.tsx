import { EntityList } from "@/components/crm/entity-list";

export default function CompaniesPage() {
  return (
    <EntityList
      kind="companies"
      title="Empresas"
      description="Contas B2B associadas a contatos e leads."
      fields={[
        { name: "name", label: "Nome", required: true },
        { name: "document_number", label: "Documento" },
        { name: "segment", label: "Segmento" },
      ]}
      columns={[
        { key: "name", label: "Nome" },
        { key: "document_number", label: "Documento" },
        { key: "segment", label: "Segmento" },
        { key: "owner.full_name", label: "Owner" },
      ]}
    />
  );
}
