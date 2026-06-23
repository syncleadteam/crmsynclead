import { EntityList } from "@/components/crm/entity-list";

export default function LeadsPage() {
  return (
    <EntityList
      kind="leads"
      title="Leads"
      description="Entradas captadas pela landing e pelos canais antes de virarem oportunidades."
      fields={[
        { name: "contact_id", label: "ID do contato", required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Novo", value: "new" },
            { label: "Contatado", value: "contacted" },
            { label: "Qualificado", value: "qualified" },
            { label: "Desqualificado", value: "disqualified" },
          ],
        },
        { name: "score", label: "Score", type: "number" },
        { name: "disqualification_reason", label: "Motivo de desqualificacao" },
      ]}
      columns={[
        { key: "contact.full_name", label: "Contato" },
        { key: "status", label: "Status" },
        { key: "score", label: "Score" },
        { key: "contact.company.name", label: "Conta" },
        { key: "owner.full_name", label: "Consultor" },
      ]}
    />
  );
}
