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

/**
 * Server-compatible function to resolve back action based on the `from` query parameter.
 * This is a server-side version of the client-side resolveBackAction function.
 */
function resolveBackActionServer(from: string | null): { label: string; href: string } | null {
  if (!from) return null;
  
  const backTargets: Record<string, { label: string; href: string }> = {
    issues: { label: "Back to Issues", href: "/org/issues" },
    intelligence: { label: "Back to Intelligence", href: "/org/intelligence" },
    structure: { label: "Back to Structure", href: "/org/structure" },
    people: { label: "Back to People", href: "/org/people" },
    ownership: { label: "Back to Ownership", href: "/org/ownership" },
  };
  
  return backTargets[from] || null;
}

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: { teamId: string };
  searchParams: Promise<{ from?: string }>;
}) {
  const team = await getTeamById(params.teamId);
  if (!team) return notFound();

  const resolvedSearchParams = await searchParams;
  const fromParam = resolvedSearchParams.from || null;

  const department = (team as any).department;
  const allDepartments = await getDepartmentsWithTeams();
  
  // Filter out any "Unassigned" department and map to simple format
  const departments = allDepartments
    .filter((d: any) => d.name?.trim().toLowerCase() !== "unassigned")
    .map((d: any) => ({
      id: d.id,
      name: d.name,
    }));

  // Resolve back action based on from param or fallback to structure navigation
  const resolvedBackAction = fromParam ? resolveBackActionServer(fromParam) : null;
  
  // Default back action: back to Structure
  const defaultBackAction = {
    label: "Back to Structure",
    href: "/org/structure",
  };
  
  const backAction = resolvedBackAction || defaultBackAction;

  return (
    <div className="space-y-8">
      <OrgPageHeader
        title={team.name}
        description="Manage this team's details, ownership, and membership."
        backAction={backAction}
      />

      <TeamPageClient team={team as any} departments={departments} />
    </div>
  );
}

