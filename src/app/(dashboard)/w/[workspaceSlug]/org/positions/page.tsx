/**
 * Positions & Roles — OrgPositions for the workspace
 */

import { redirect } from "next/navigation";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { prisma } from "@/lib/db";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { PositionsClient } from "@/components/org/PositionsClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function PositionsPage({ params }: PageProps) {
  await params; // consume params (workspaceSlug not needed server-side here)

  const context = await getOrgPermissionContext();

  if (!context) {
    redirect("/welcome");
  }

  const [positions, teams] = await Promise.all([
    prisma.orgPosition.findMany({
      where: { workspaceId: context.orgId, isActive: true, archivedAt: null },
      orderBy: [{ level: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        level: true,
        teamId: true,
        team: { select: { id: true, name: true } },
      },
    }),
    prisma.orgTeam.findMany({
      where: { workspaceId: context.orgId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
      },
    }),
  ]);

  const positionItems = positions.map((p) => ({
    id: p.id,
    title: p.title,
    level: p.level,
    teamId: p.teamId,
    teamName: p.team?.name ?? null,
  }));

  const teamItems = teams.map((t) => ({
    id: t.id,
    name: t.name,
    departmentId: t.departmentId ?? undefined,
    department: t.department ?? undefined,
  }));

  return (
    <>
      <OrgPageHeader
        legacyBreadcrumb="ORG / POSITIONS"
        title="Positions & Roles"
        description="Define positions and role cards for your organization"
      />
      <div className="p-10 pb-10 max-w-6xl">
        <PositionsClient
          positions={positionItems}
          teams={teamItems}
          workspaceId={context.orgId}
        />
      </div>
    </>
  );
}
