/**
 * Workspace-Scoped Intelligence Drilldowns Page
 */

import { IntelligenceDrilldownsClient } from "@/components/org/IntelligenceDrilldownsClient";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";

export const dynamic = "force-dynamic";

export default function WorkspaceOrgIntelligenceDrilldownsPage() {
  return (
    <>
      <OrgPageHeader
        breadcrumb="ORG / INTELLIGENCE / DRILLDOWNS"
        title="Intelligence drilldowns"
        description="Deep-dive into specific intelligence metrics and signals."
      />
      <div className="px-10 pb-10">
        <IntelligenceDrilldownsClient />
      </div>
    </>
  );
}
