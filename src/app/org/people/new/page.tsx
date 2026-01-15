/**
 * New Person Page
 * 
 * Route for creating a new person in the org.
 * Feature-flagged via org.people.write flag.
 */

import { AddPersonForm } from "@/components/org/AddPersonForm";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";

export default function NewPersonPage() {
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

