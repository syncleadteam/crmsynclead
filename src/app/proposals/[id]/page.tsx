import { ProposalDetail } from "@/app/proposals/[id]/proposal-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProposalDetailPage({ params }: PageProps) {
  const { id } = await params;

  return <ProposalDetail id={id} />;
}
