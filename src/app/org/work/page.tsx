/**
 * Org Work Requests Page
 * 
 * Lists work requests and allows creating new ones.
 * Phase H: Work Intake Sizing foundation.
 */

import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { WorkRequestListClient } from "@/components/org/work/WorkRequestListClient";

export const dynamic = "force-dynamic";

export default function OrgWorkPage() {
  return (
    <>
      <OrgPageHeader
        breadcrumb="ORG / WORK"
        title="Work Requests"
        description="View and manage work intake requests for staffing and capacity planning."
      />
      <div className="px-10 pb-10">
        <WorkRequestListClient />
      </div>
    </>
  );
}
