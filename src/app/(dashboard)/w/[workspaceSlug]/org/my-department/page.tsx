/**
 * My Department — Department derived from user's team membership
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users } from "lucide-react";
import Link from "next/link";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function MyDepartmentPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <div className="p-10">
        <p className="text-slate-500">You need to be in a workspace to view your department.</p>
      </div>
    );
  }

  const userPosition = await prisma.orgPosition.findFirst({
    where: {
      workspaceId: context.orgId,
      userId: context.userId,
      isActive: true,
      archivedAt: null,
      teamId: { not: null },
    },
    include: {
      team: {
        include: {
          department: {
            include: {
              teams: {
                include: {
                  _count: { select: { positions: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const department = userPosition?.team?.department;

  if (!department) {
    return (
      <>
        <OrgPageHeader
          legacyBreadcrumb="ORG / MY DEPARTMENT"
          title="My Department"
          description="Your department overview"
        />
        <div className="p-10">
          <Card className="border-[#1e293b] bg-[#0B1220] max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <Building2 className="h-10 w-10 text-slate-500" />
              <p className="text-slate-300 font-medium">No department assigned</p>
              <p className="text-sm text-slate-500">
                {"You haven't been assigned to a department yet. Ask your admin to assign you."}
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const totalMembers = department.teams.reduce(
    (sum, t) => sum + t._count.positions,
    0
  );

  return (
    <>
      <OrgPageHeader
        legacyBreadcrumb="ORG / MY DEPARTMENT"
        title={department.name}
        description={department.description ?? undefined}
      />
      <div className="p-10 pb-10 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2 text-slate-50">
            <Building2 className="h-8 w-8" />
            {department.name}
          </h1>
          {department.description && (
            <p className="text-slate-400 mt-2">{department.description}</p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-[#1e293b] bg-[#0B1220]">
            <CardHeader>
              <CardTitle className="text-slate-50">Department Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Teams</span>
                <span className="font-medium text-slate-200">{department.teams.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total members</span>
                <span className="font-medium text-slate-200">{totalMembers}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#1e293b] bg-[#0B1220]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-50">
                <Users className="h-5 w-5" />
                Teams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {department.teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/w/${workspaceSlug}/org/structure/teams/${team.id}`}
                    className="block p-3 rounded-lg bg-[#020617] border border-[#1e293b] hover:bg-[#0f172a] hover:border-slate-600 transition-colors"
                  >
                    <p className="font-medium text-slate-200">{team.name}</p>
                    <p className="text-sm text-slate-500">{team._count.positions} members</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
