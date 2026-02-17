/**
 * Org Admin — Decision Authority
 */

import { redirect } from "next/navigation";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { assertAccess } from "@/lib/auth/assertAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Scale } from "lucide-react";
import Link from "next/link";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function AdminDecisionsPage({ params }: PageProps) {
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
        legacyBreadcrumb="ORG / ADMIN / DECISIONS"
        title="Decision Authority"
        description="Manage decision domains and authority mapping"
      />
      <div className="p-10 pb-10">
        <Card className="border-[#1e293b] bg-[#0B1220]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Scale className="h-12 w-12 text-slate-500 mb-4" />
            <p className="text-slate-500 mb-4">Decision authority configuration</p>
            <Link
              href={`/w/${workspaceSlug}/org/admin/settings`}
              className="text-sm text-[#5CA9FF] hover:underline"
            >
              Open Org Settings →
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
