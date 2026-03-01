/**
 * Org Admin — Responsibility Profiles (placeholder)
 */

import { redirect } from "next/navigation";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { assertAccess } from "@/lib/auth/assertAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCog, ArrowRight } from "lucide-react";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function ResponsibilityPage({ params }: PageProps) {
  const { workspaceSlug } = await params;

  const context = await getOrgPermissionContext();

  if (!context) {
    redirect("/welcome");
  }

  try {
    await assertAccess({
      userId: context.userId,
      workspaceId: context.workspaceId,
      scope: "workspace",
      requireRole: ["OWNER", "ADMIN"],
    });
  } catch {
    redirect(`/w/${workspaceSlug}/org/profile`);
  }

  return (
    <>
      <OrgPageHeader
        legacyBreadcrumb="ORG / ADMIN / RESPONSIBILITY"
        title="Responsibility Profiles"
        description="Define and manage responsibility profiles"
      />
      <div className="p-10 pb-10">
        <Card className="border-[#1e293b] bg-[#0B1220]">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <UserCog className="h-12 w-12 text-slate-500" />
            <div className="text-center">
              <p className="text-slate-200 font-medium mb-1">Responsibility Profiles</p>
              <p className="text-slate-400 text-sm max-w-md">
                Define what each role owns and is accountable for. Responsibility profiles are
                configured per position in the org directory.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:text-white">
              <Link href={`/w/${workspaceSlug}/org/positions`}>
                View Positions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
