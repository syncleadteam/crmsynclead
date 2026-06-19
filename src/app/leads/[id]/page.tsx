import { LeadDetail } from "@/app/leads/[id]/lead-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <LeadDetail id={id} />;
}
