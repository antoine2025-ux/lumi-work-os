/**
 * LEGACY Org Chart Page (moved to /org-legacy/chart)
 * 
 * This is the old read-only structure view. The canonical structure page
 * is now at /org/structure with full create/edit capabilities.
 * 
 * This page is kept for backward compatibility but should not be linked
 * from NEW Org navigation.
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { prisma } from "@/lib/db";
import { OrgChartView } from "./OrgChartView";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { requireOrgWorkspaceId } from "@/server/org/workspace";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";

// Force dynamic rendering - this page requires authentication
export const dynamic = "force-dynamic";

export default async function OrgChartPage() {
  const context = await getOrgPermissionContext();
  
  if (!context) {
    return (
      <>
        <OrgPageHeader
          breadcrumb="ORG / STRUCTURE"
          title="Structure"
          description="See how work is organized: departments, teams, and reporting lines."
        />
        <div className="px-10 pb-10">
          <OrgEmptyState
            title="No organization selected"
            description="You need to create or select a workspace to view structure."
          />
        </div>
      </>
    );
  }

  // Use canonical workspace ID helper
  const workspaceId = await requireOrgWorkspaceId();

  // Load departments from database
  const departments = await prisma.orgDepartment.findMany({
    where: { workspaceId, isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  // Load teams grouped by department
  const teams = await prisma.orgTeam.findMany({
    where: { workspaceId, isActive: true },
    select: { 
      id: true, 
      name: true, 
      departmentId: true,
    },
    orderBy: { name: "asc" },
  });

  // Group teams by department ID
  const teamsByDepartmentId = new Map<string, typeof teams>();
  for (const team of teams) {
    if (!team.departmentId) continue;
    const key = String(team.departmentId);
    const arr = teamsByDepartmentId.get(key) ?? [];
    arr.push(team);
    teamsByDepartmentId.set(key, arr);
  }

  // Build department rows with team counts
  const departmentRows = departments.map((dept) => {
    const deptTeams = teamsByDepartmentId.get(String(dept.id)) ?? [];
    const teamCount = deptTeams.length;
    
    return {
      id: dept.id,
      name: dept.name,
      teamsCount: teamCount,
      peopleCount: null as number | null, // Will be null until membership mapping exists
    };
  });

  return (
    <>
      <OrgPageViewTracker route="/org/chart" name="Org Structure" />
      <OrgPageHeader
        breadcrumb="ORG / STRUCTURE"
        title="Structure"
        description="See how work is organized: departments, teams, and reporting lines."
      />
      <div className="px-10 pb-10">
        {departments.length === 0 ? (
          <div className="mt-8">
            <OrgEmptyState
              title="No departments yet"
              description="Create departments to start structuring your organization."
            />
          </div>
        ) : (
          <OrgChartView departments={departmentRows} />
        )}
      </div>
    </>
  );
}
