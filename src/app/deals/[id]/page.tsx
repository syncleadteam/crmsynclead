import { DealDetail } from "@/app/deals/[id]/deal-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DealDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <DealDetail id={id} />;
}
