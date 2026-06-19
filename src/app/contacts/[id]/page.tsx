import { EntityDetail } from "@/components/crm/entity-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <EntityDetail
      endpoint={`/api/v1/contacts/${id}`}
      backHref="/contacts"
      title="Detalhe do contato"
    />
  );
}
