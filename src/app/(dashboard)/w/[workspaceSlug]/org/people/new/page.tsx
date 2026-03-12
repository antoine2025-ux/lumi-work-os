/**
 * Workspace-Scoped New Person Page
 */

import { AddPersonForm } from "@/components/org/AddPersonForm";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";

export default async function WorkspaceOrgNewPersonPage() {
  const context = await getOrgPermissionContext();

  return (
    <>
      <OrgPageHeader
        legacyBreadcrumb="ORG / PEOPLE / ADD"
        title="Add person"
        description="Add someone to your org. You can fill missing details later."
      />
      <div className="px-10 pb-10">
        <AddPersonForm workspaceId={context?.workspaceId ?? undefined} />
      </div>
    </>
  );
}
