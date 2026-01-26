/**
 * Work Request Detail Page
 * 
 * Shows work request details with feasibility analysis and candidate recommendations.
 * Phase H: UI renders API output only; ranking logic lives in resolver.
 */

import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { WorkRequestDetailClient } from "@/components/org/work/WorkRequestDetailClient";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WorkRequestDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <>
      <OrgPageHeader
        breadcrumb="ORG / WORK"
        title="Work Request"
        description="View staffing feasibility and candidate recommendations."
      />
      <div className="px-10 pb-10">
        <WorkRequestDetailClient id={id} />
      </div>
    </>
  );
}
