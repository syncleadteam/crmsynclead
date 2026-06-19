import { EntityDetail } from "@/components/crm/entity-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CompanyDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <EntityDetail
      endpoint={`/api/v1/companies/${id}`}
      backHref="/companies"
      title="Detalhe da empresa"
    />
  );
}
