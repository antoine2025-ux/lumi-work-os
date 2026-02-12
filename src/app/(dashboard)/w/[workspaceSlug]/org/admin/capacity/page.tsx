/**
 * Org Admin — Capacity Planning (placeholder)
 */

import { redirect } from "next/navigation";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { assertAccess } from "@/lib/auth/assertAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function CapacityPlanningPage({ params }: PageProps) {
  const { workspaceSlug } = await params;

  const context = await getOrgPermissionContext();

  if (!context) {
    redirect("/welcome");
  }

  try {
    await assertAccess({
      userId: context.userId,
      workspaceId: context.orgId,
      scope: "workspace",
      requireRole: ["OWNER", "ADMIN"],
    });
  } catch {
    redirect(`/w/${workspaceSlug}/org/profile`);
  }

  return (
    <>
      <OrgPageHeader
        breadcrumb="ORG / ADMIN / CAPACITY"
        title="Capacity Planning"
        description="Plan and track team capacity"
      />
      <div className="p-10 pb-10">
        <Card className="border-[#1e293b] bg-[#0B1220]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gauge className="h-12 w-12 text-slate-500 mb-4" />
            <p className="text-slate-500">Capacity planning features coming soon</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
