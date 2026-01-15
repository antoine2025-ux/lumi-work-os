/**
 * Team Detail Page - Server Component
 * 
 * Shows team details, owner, and department information.
 */

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTeamById, getDepartmentsWithTeams } from "@/lib/org/queries";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { TeamPageClient } from "./TeamPageClient";
import { cn } from "@/lib/utils";

export default async function TeamPage({
  params,
}: {
  params: { teamId: string };
}) {
  const team = await getTeamById(params.teamId);
  if (!team) return notFound();

  const department = (team as any).department;
  const allDepartments = await getDepartmentsWithTeams();
  
  // Filter out any "Unassigned" department and map to simple format
  const departments = allDepartments
    .filter((d: any) => d.name?.trim().toLowerCase() !== "unassigned")
    .map((d: any) => ({
      id: d.id,
      name: d.name,
    }));

  // Determine breadcrumb and back link based on department
  const breadcrumb = department
    ? `ORG / STRUCTURE / ${department.name.toUpperCase()}`
    : "ORG / STRUCTURE / UNASSIGNED TEAMS";
  
  const backHref = department
    ? `/org/structure/departments/${department.id}`
    : "/org/structure#unassigned";

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
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
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

