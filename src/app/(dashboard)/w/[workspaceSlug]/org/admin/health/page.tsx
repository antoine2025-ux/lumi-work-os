/**
 * Org Admin — Health / Issues (moved from /org/issues)
 */

import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgIssuesInboxClient } from "@/components/org/issues/OrgIssuesInboxClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function AdminHealthIssuesPage({ params }: PageProps) {
  const { workspaceSlug: _workspaceSlug } = await params;

  return (
    <>
      <OrgPageHeader
        legacyBreadcrumb="ORG / ADMIN / HEALTH"
        title="Issues"
        description="Review and manage structural issues in your organization."
      />
      <div className="px-10 pb-10">
        <OrgIssuesInboxClient />
      </div>
    </>
  );
}
