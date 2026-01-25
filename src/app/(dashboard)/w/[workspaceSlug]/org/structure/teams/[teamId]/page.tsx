/**
 * Workspace-Scoped Team Detail Page
 */

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTeamById, getDepartmentsWithTeams } from "@/lib/org/queries";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { TeamPageClient } from "@/app/org/structure/teams/[teamId]/TeamPageClient";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ workspaceSlug: string; teamId: string }>;
};

export default async function WorkspaceOrgTeamPage({ params }: PageProps) {
  const { workspaceSlug, teamId } = await params;
  const team = await getTeamById(teamId);
  if (!team) return notFound();

  const department = (team as any).department;
  const allDepartments = await getDepartmentsWithTeams();

  const departments = allDepartments
    .filter((d: any) => d.name?.trim().toLowerCase() !== "unassigned")
    .map((d: any) => ({
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
        breadcrumb={breadcrumb}
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

      <TeamPageClient team={team as any} departments={departments} />
    </div>
  );
}
