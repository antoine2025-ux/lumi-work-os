/**
 * Positions & Roles — Role cards for the workspace
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus } from "lucide-react";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function PositionsPage({ params }: PageProps) {
  const { workspaceSlug } = await params;

  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <>
        <OrgPageHeader
          legacyBreadcrumb="ORG / POSITIONS"
          title="Positions & Roles"
          description="Define positions and role cards for your organization"
        />
        <div className="p-10">
          <p className="text-slate-500">You need to be in a workspace to view positions.</p>
        </div>
      </>
    );
  }

  const roleCards = await prisma.roleCard.findMany({
    where: { workspaceId: context.orgId },
    orderBy: { roleName: "asc" },
  });

  return (
    <>
      <OrgPageHeader
        legacyBreadcrumb="ORG / POSITIONS"
        title="Positions & Roles"
        description="Define positions and role cards for your organization"
      />
      <div className="p-10 pb-10 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div />
          <Button className="bg-[#243B7D] hover:bg-[#1e3a6e] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Position
          </Button>
        </div>

        {roleCards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roleCards.map((role) => (
              <Card key={role.id} className="border-[#1e293b] bg-[#0B1220]">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-slate-50 text-base">
                    <span className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      {role.roleName}
                    </span>
                    <Badge variant="outline" className="border-slate-600 text-slate-400">
                      {role.level}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">
                    {role.roleDescription || "No description provided"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-[#1e293b] bg-[#0B1220]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Briefcase className="h-12 w-12 text-slate-500 mb-4" />
              <p className="text-slate-500 mb-4">No positions defined yet</p>
              <Button className="bg-[#243B7D] hover:bg-[#1e3a6e] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create First Position
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
