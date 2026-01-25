/**
 * Workspace-Scoped New Person Page
 */

import { AddPersonForm } from "@/components/org/AddPersonForm";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";

export default function WorkspaceOrgNewPersonPage() {
  return (
    <>
      <OrgPageHeader
        breadcrumb="ORG / PEOPLE / ADD"
        title="Add person"
        description="Add someone to your org. You can fill missing details later."
      />
      <div className="px-10 pb-10">
        <AddPersonForm />
      </div>
    </>
  );
}
