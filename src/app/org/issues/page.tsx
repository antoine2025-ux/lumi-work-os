/**
 * Org Issues Inbox Page
 * 
 * Displays structural issues with resolution state overlay.
 * Users can review, acknowledge, and mark issues as resolved.
 */

import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgIssuesInboxClient } from "@/components/org/issues/OrgIssuesInboxClient";

export const dynamic = "force-dynamic";

export default function OrgIssuesPage() {
  return (
    <>
      <OrgPageHeader
        title="Issues"
        description="Review and manage structural issues in your organization."
      />
      <div className="px-10 pb-10">
        <OrgIssuesInboxClient />
      </div>
    </>
  );
}

