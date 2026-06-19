import { EntityList } from "@/components/crm/entity-list";

export default function ProposalsPage() {
  return (
    <EntityList
      kind="proposals"
      title="Propostas"
      description="Propostas comerciais versionadas por deal."
      fields={[
        { name: "deal_id", label: "ID do deal", required: true },
        { name: "title", label: "Titulo", required: true },
        { name: "total_value", label: "Valor total", type: "number" },
        { name: "pdf_url", label: "URL do PDF" },
      ]}
      columns={[
        { key: "title", label: "Titulo" },
        { key: "deal.title", label: "Deal" },
        { key: "version", label: "Versao" },
        { key: "status", label: "Status" },
        { key: "total_value", label: "Valor" },
      ]}
    />
  );
}
