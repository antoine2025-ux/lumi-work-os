/**
 * Workspace-Scoped Org Activity & Exports Page
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { hasOrgCapability } from "@/lib/org/capabilities";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";
import { ActivityContent } from "@/app/org/activity/ActivityContent";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function WorkspaceOrgActivityPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <>
        <OrgPageHeader
          breadcrumb="ORG / ACTIVITY & EXPORTS"
          title="Activity & exports"
          description="Review recent admin activity and export a snapshot of your org."
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="No organization selected"
            description="You need to create or select a workspace to view activity."
            primaryActionLabel="Create workspace"
            primaryActionHref="/welcome"
          />
        </div>
      </>
    );
  }

  const canView = hasOrgCapability(context.role, "org:activity:view");

  if (!canView) {
    return (
      <div className="px-10 pt-10">
        <div className="rounded-xl border border-slate-800 bg-[#020617] px-6 py-8 text-[13px] text-slate-200">
          <div className="mb-1 text-sm font-semibold text-slate-50">
            You don&apos;t have access to activity
          </div>
          <p className="text-[11px] text-slate-500">
            Ask an owner or admin to grant you access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <OrgPageViewTracker route={`/w/${workspaceSlug}/org/activity`} name="Org Activity" />
      <OrgPageHeader
        breadcrumb="ORG / ACTIVITY & EXPORTS"
        title="Activity & exports"
        description="Review recent admin activity and export a snapshot of your org."
      />
      <ActivityContent context={context} />
    </>
  );
}
