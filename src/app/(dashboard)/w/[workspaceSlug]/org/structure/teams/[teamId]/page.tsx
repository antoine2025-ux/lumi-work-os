/**
 * Workspace-Scoped Team Detail Page
 */

export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTeamById, getDepartmentsWithTeams } from "@/lib/org/queries";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { TeamPageClient } from "@/app/org/structure/teams/[teamId]/TeamPageClient";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";

type PageProps = {
  params: Promise<{ workspaceSlug: string; teamId: string }>;
};

export default async function WorkspaceOrgTeamPage({ params }: PageProps) {
  const { workspaceSlug, teamId } = await params;
  const ctx = await getOrgPermissionContext();
  if (!ctx) redirect("/login");

  const team = await getTeamById(teamId, ctx.workspaceId);
  if (!team) return notFound();

  const department = team.department;
  const allDepartments = await getDepartmentsWithTeams();

  setWorkspaceContext(team.workspaceId);
  const teamProjects = await prisma.project.findMany({
    where: {
      teamId: team.id,
      workspaceId: team.workspaceId,
    },
    select: {
      id: true,
      name: true,
      status: true,
      _count: { select: { tasks: true } },
    },
  });

  const departments = allDepartments
    .filter((d) => d.name?.trim().toLowerCase() !== "unassigned")
    .map((d) => ({
      id: d.id,
      name: d.name,
    }));

  const breadcrumb = department
    ? `ORG / STRUCTURE / ${department.name.toUpperCase()}`
    : "ORG / STRUCTURE / UNASSIGNED TEAMS";

  const backHref = department
    ? `/w/${workspaceSlug}/org/structure/departments/${department.id}`
    : `/w/${workspaceSlug}/org/structure#unassigned`;

  return (
    <div className="space-y-8">
      <OrgPageHeader
        legacyBreadcrumb={breadcrumb}
        title={team.name}
        description="Manage this team's details, ownership, and membership."
        backLink={
          <Link
            href={backHref}
            className={cn(
              "inline-flex items-center gap-1.5",
              "text-[12px] text-slate-500 hover:text-slate-300",
              "transition-colors duration-150"
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {department ? `Back to ${department.name}` : "Back to Structure"}
          </Link>
        }
      />

      <TeamPageClient team={team as unknown as Parameters<typeof TeamPageClient>[0]['team']} departments={departments} />

      <Card>
        <CardHeader>
          <CardTitle>Team Projects ({teamProjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {teamProjects.length > 0 ? (
            <div className="space-y-2">
              {teamProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/w/${workspaceSlug}/projects/${project.id}`}
                  className="block p-3 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {project._count.tasks} tasks · {project.status}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No projects assigned</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
